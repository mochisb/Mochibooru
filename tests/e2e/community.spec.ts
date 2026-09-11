import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, closeDb, user, posts } from '@mochi/db';

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

	await page.goto('/login?mode=register');
	await page.getByLabel('Nombre', { exact: true }).fill('Mochi Tester');
	await page.getByLabel('Correo electrónico').fill(email);
	await page.getByLabel('Contraseña').fill('A-real-test-password-123!');
	await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

	await page.goto('/upload');
	await page
		.getByLabel('Seleccionar imágenes')
		.setInputFiles({ name: 'landscape.png', mimeType: 'image/png', buffer: image });
	await page.getByLabel('Título').fill('Paisaje de prueba');
	await page.getByLabel('Etiquetas', { exact: true }).fill(`landscape sunset test_${unique}`);
	await page.getByRole('button', { name: /Publicar 1 imágenes/ }).click();
	await expect(page.getByText('En cola de procesamiento', { exact: false })).toBeVisible();
	await page.getByRole('link', { name: 'Ver landscape.png' }).click();
	await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
	const id = page.url().split('/').at(-1)!;
	await expect(page.locator('.image-viewer > img')).toBeVisible();
	await expect(page.getByText('Publicada', { exact: true })).toBeVisible();
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

	await page.getByRole('button', { name: 'Guardar en favoritos' }).click();
	await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible();
	await page.goto('/?view=favorites');
	await expect(page.locator(`a.post-card[href="/posts/${id}"]`)).toBeVisible();
	await page.getByLabel('Buscar publicaciones').fill(`test_${unique} width:>=600 -dog`);
	await page.getByRole('button', { name: 'Buscar', exact: true }).click();
	await expect(page.locator(`a.post-card[href="/posts/${id}"]`)).toBeVisible();
	await page.goto(`/?q=test_${unique}%20-sunset`);
	await expect(page.getByRole('heading', { name: 'Aún no hay coincidencias' })).toBeVisible();

	await page.goto(`/posts/${id}`);
	await page.getByRole('button', { name: 'Editar publicación' }).click();
	await page.getByLabel('Etiquetas', { exact: true }).fill(`landscape test_${unique} edited`);
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByText('Publicación actualizada.', { exact: true })).toBeVisible();
	const history = page.locator('.revision').filter({ hasText: 'Metadatos editados' });
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
			'Paisaje de prueba',
		);
		expect((await stranger.request.get('/moderation')).status()).toBe(403);

		await getDb().update(user).set({ role: 'admin' }).where(eq(user.email, email));
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Moderación', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Retirar publicación' }).click();
		await expect(page.getByText('Retirada de la galería', { exact: true })).toBeVisible();
		expect((await stranger.request.get(`/media/${id}/original`)).status()).toBe(404);
		expect((await stranger.request.get(`/posts/${id}`)).status()).toBe(404);
		await page.getByRole('button', { name: 'Aprobar publicación' }).click();
		await expect(page.getByText('Publicada', { exact: true })).toBeVisible();
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
	await page.getByRole('button', { name: 'Ayuda de búsqueda' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByRole('button', { name: 'Cerrar ayuda' }).click();
	await page.getByRole('button', { name: 'Activar tema claro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	expect(errors).toEqual([]);
});
