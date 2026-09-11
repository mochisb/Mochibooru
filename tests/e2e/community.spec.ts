import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, closeDb, user, posts } from '@mochi/db';

// The interface stays in English regardless of the browser's preferred language.
test.use({ locale: 'es-ES' });

test.afterAll(async () => {
	await closeDb();
});

test('registration → upload → processing → search → favorites → moderation', async ({
	page,
	browser,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const unique = randomUUID().replaceAll('-', '');
	const email = `${unique}@example.test`;
	const origin = process.env.E2E_BASE_URL ?? process.env.ORIGIN ?? 'http://localhost:5173';
	const image = await sharp({
		create: { width: 640, height: 480, channels: 3, background: '#8d77b7' },
	})
		.png()
		.withMetadata({ exif: { IFD0: { ImageDescription: unique } } })
		.toBuffer();

	const response = await page.goto('/login?mode=register');
	expect(response?.headers()['content-language']).toBe('en');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await page.getByLabel('Name', { exact: true }).fill('Mochi Tester');
	await page.getByLabel('Email address').fill(email);
	await page.getByLabel('Password').fill('A-real-test-password-123!');
	await page.getByRole('button', { name: 'Create account', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

	await page.goto('/upload');
	await page
		.getByLabel('Select images')
		.setInputFiles({ name: 'landscape.png', mimeType: 'image/png', buffer: image });
	await page.getByLabel('Title').fill('Test landscape');
	await page.getByLabel('Tags', { exact: true }).fill(`landscape sunset test_${unique}`);
	await page.getByRole('button', { name: 'Upload 1 image', exact: true }).click();
	await expect(page.getByText('Queued for processing', { exact: false })).toBeVisible();
	await page.getByRole('link', { name: 'View landscape.png' }).click();
	await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
	const id = page.url().split('/').at(-1)!;
	await expect(page.locator('.image-viewer > img')).toBeVisible();
	await expect(page.getByText('Published', { exact: true })).toBeVisible();
	await expect
		.poll(async () =>
			page
				.locator('.image-viewer > img')
				.evaluate((image) => (image as HTMLImageElement).naturalWidth),
		)
		.toBe(640);
	expect((await page.request.get(`/media/${id}/original`)).headers()['content-type']).toBe(
		'image/png',
	);

	const duplicate = await page.request.post('/api/v1/posts', {
		headers: { origin },
		multipart: {
			file: { name: 'same.png', mimeType: 'image/png', buffer: image },
			tags: 'landscape',
			rating: 'safe',
		},
	});
	expect(duplicate.status()).toBe(409);
	const csrf = await page.request.post('/api/v1/posts', {
		headers: { origin: 'https://untrusted.example' },
	});
	expect(csrf.status()).toBe(403);

	await page.getByRole('button', { name: 'Save to favorites' }).click();
	await expect(page.getByRole('button', { name: 'Remove from favorites' })).toBeVisible();
	await page.goto('/?view=favorites');
	await expect(page.locator(`a.post-card[href="/posts/${id}"]`)).toBeVisible();
	await page.getByLabel('Search posts').fill(`test_${unique} width:>=600 -dog`);
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	await expect(page.locator(`a.post-card[href="/posts/${id}"]`)).toBeVisible();
	await page.goto(`/?q=test_${unique}%20-sunset`);
	await expect(page.getByRole('heading', { name: 'No matches yet' })).toBeVisible();

	await page.goto(`/posts/${id}`);
	await page.getByRole('button', { name: 'Edit post' }).click();
	await page.getByLabel('Tags', { exact: true }).fill(`landscape test_${unique} edited`);
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByText('Post updated.', { exact: true })).toBeVisible();
	const history = page.locator('.revision').filter({ hasText: 'Metadata edited' });
	await history.locator('summary').click();
	await expect(history.locator('pre')).toContainText('sunset');

	// A different signed-in member cannot edit this user's post or forge an admin role.
	const stranger = await browser.newContext({ baseURL: origin });
	try {
		const signup = await stranger.request.post('/api/auth/sign-up/email', {
			headers: { origin },
			data: {
				name: 'Other member',
				email: `other-${unique}@example.test`,
				password: 'Another-test-password-123!',
				role: 'admin',
			},
		});
		expect(signup.ok()).toBe(true);
		expect((await signup.json()).user.role).toBe('member');
		const unauthorized = await stranger.request.post(`/posts/${id}?/edit`, {
			headers: { origin, accept: 'application/json' },
			form: { title: 'Hijacked', tags: 'hijacked', rating: 'safe', source: '' },
		});
		expect(await unauthorized.json()).toMatchObject({ type: 'failure', status: 403 });
		expect((await getDb().select().from(posts).where(eq(posts.id, id)))[0].title).toBe(
			'Test landscape',
		);
		expect((await stranger.request.get('/moderation')).status()).toBe(403);

		await getDb().update(user).set({ role: 'admin' }).where(eq(user.email, email));
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Moderation', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Remove post' }).click();
		await expect(page.getByText('Removed from the gallery', { exact: true })).toBeVisible();
		expect((await stranger.request.get(`/media/${id}/original`)).status()).toBe(404);
		expect((await stranger.request.get(`/posts/${id}`)).status()).toBe(404);
		await page.getByRole('button', { name: 'Approve post' }).click();
		await expect(page.getByText('Published', { exact: true })).toBeVisible();
	} finally {
		await stranger.close();
	}

	// Invalid payloads never become visible media, regardless of their declared MIME type.
	const invalid = await page.request.post('/api/v1/posts', {
		headers: { origin },
		multipart: {
			file: {
				name: 'invalid.png',
				mimeType: 'image/png',
				buffer: Buffer.from(`invalid-${unique}`),
			},
			tags: 'invalid',
			rating: 'safe',
		},
	});
	expect(invalid.status()).toBe(201);
	const invalidId = (await invalid.json()).id;
	await expect
		.poll(
			async () => (await getDb().select().from(posts).where(eq(posts.id, invalidId)))[0]?.status,
		)
		.toBe('failed');
	expect((await page.request.get(`/media/${invalidId}/original`)).status()).toBe(404);

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`/?q=test_${unique}`);
	await expect(page.locator(`a.post-card[href="/posts/${id}"]`)).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true,
	);
	await page.getByRole('button', { name: 'Search help' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByRole('button', { name: 'Close help' }).click();
	await page.getByRole('button', { name: 'Switch to light theme' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	expect(errors).toEqual([]);
});
