import { afterAll, expect, test } from 'bun:test';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { getDb, closeDb, posts, user } from '@mochi/db';
import { localStorage } from '../../packages/storage/src';
import { processPost } from '../../apps/worker/src/process';

process.env.REQUIRE_APPROVAL = 'true';
afterAll(closeDb);

test('a partial storage failure is retryable, idempotent and respects review', async () => {
	const root = await mkdtemp(join(tmpdir(), 'mochi-worker-'));
	const id = randomUUID();
	const actorId = randomUUID();
	const storage = localStorage(root);
	const bytes = await sharp({
		create: { width: 320, height: 240, channels: 3, background: '#725894' },
	})
		.png()
		.withMetadata({ exif: { IFD0: { ImageDescription: id } } })
		.toBuffer();
	const originalKey = `originals/${id}.bin`;
	const db = getDb();
	try {
		await db
			.insert(user)
			.values({ id: actorId, name: 'Worker test', email: `${actorId}@example.test` });
		await storage.put(originalKey, bytes, 'application/octet-stream');
		await db.insert(posts).values({
			id,
			uploaderId: actorId,
			sha256: createHash('sha256').update(bytes).digest('hex'),
			originalKey,
			bytes: bytes.length,
		});
		let writes = 0;
		const failing = {
			...storage,
			async put(...args: Parameters<typeof storage.put>) {
				if (++writes === 2) throw new Error('Storage temporarily unavailable');
				await storage.put(...args);
			},
		};
		await expect(processPost(id, failing)).rejects.toThrow('Storage temporarily unavailable');
		expect((await db.select().from(posts).where(eq(posts.id, id)))[0].status).toBe('processing');
		await processPost(id, storage);
		const [processed] = await db.select().from(posts).where(eq(posts.id, id));
		expect(processed.status).toBe('pending');
		expect(processed.width).toBe(320);
		expect(processed.height).toBe(240);
		expect((await storage.read(processed.previewKey!)).length).toBeGreaterThan(0);
		await processPost(id, storage);
		const [repeated] = await db.select().from(posts).where(eq(posts.id, id));
		expect(repeated.updatedAt.getTime()).toBe(processed.updatedAt.getTime());
		expect(repeated.status).toBe('pending');
		expect(repeated.previewKey).toBe(processed.previewKey);
	} finally {
		await db.delete(posts).where(eq(posts.id, id));
		await db.delete(user).where(eq(user.id, actorId));
		await rm(root, { recursive: true, force: true });
	}
}, 20_000);
