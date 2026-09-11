import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { getDb, posts } from '@mochi/db';
import { getStorage, type Storage } from '@mochi/storage';
import { getConfig } from '@mochi/shared/config';

const formats: Record<string, string> = {
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	heif: 'image/avif',
	avif: 'image/avif',
};
export class InvalidMediaError extends Error {}

export async function makeDerivatives(bytes: Uint8Array) {
	const options = { limitInputPixels: 40_000_000, failOn: 'warning' as const };
	const meta = await sharp(bytes, options).metadata();
	const mime = formats[meta.format ?? ''];
	if (
		!mime ||
		!meta.width ||
		!meta.height ||
		(meta.format === 'heif' && meta.compression !== 'av1')
	)
		throw new InvalidMediaError('Unsupported format. Use JPEG, PNG, WebP, GIF or AVIF.');
	const height = meta.pageHeight ?? meta.height;
	if (meta.width * height > 40_000_000 || (meta.pages ?? 1) > 1000)
		throw new InvalidMediaError('The image exceeds the dimension or frame limit.');
	// Decode only the first frame for bounded previews; the original keeps its animation.
	const image = sharp(bytes, options).rotate().timeout({ seconds: 30 });
	const thumbnail = await image
		.clone()
		.resize(480, 480, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 78 })
		.toBuffer();
	const preview = await image
		.clone()
		.resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 86 })
		.toBuffer();
	const rotated = [5, 6, 7, 8].includes(meta.orientation ?? 1);
	return {
		thumbnail,
		preview,
		width: rotated ? height : meta.width,
		height: rotated ? meta.width : height,
		mime,
		animated: (meta.pages ?? 1) > 1,
	};
}

export async function processPost(id: string, storage: Storage = getStorage()) {
	const db = getDb();
	const [post] = await db.select().from(posts).where(eq(posts.id, id));
	if (!post || !['queued', 'processing'].includes(post.status)) return;
	await db
		.update(posts)
		.set({ status: 'processing', updatedAt: new Date(), processingError: null })
		.where(eq(posts.id, id));
	const bytes = await storage.read(post.originalKey);
	let result: Awaited<ReturnType<typeof makeDerivatives>>;
	try {
		result = await makeDerivatives(bytes);
	} catch (error) {
		throw new InvalidMediaError(
			error instanceof InvalidMediaError
				? error.message
				: 'Unable to decode the image. It may be corrupted or exceed the limits.',
		);
	}
	const thumbnailKey = `derived/${id}/thumbnail.webp`;
	const previewKey = `derived/${id}/preview.webp`;
	await storage.put(thumbnailKey, result.thumbnail, 'image/webp');
	await storage.put(previewKey, result.preview, 'image/webp');
	await db
		.update(posts)
		.set({
			thumbnailKey,
			previewKey,
			width: result.width,
			height: result.height,
			mime: result.mime,
			animated: result.animated,
			status: getConfig().REQUIRE_APPROVAL ? 'pending' : 'published',
			updatedAt: new Date(),
			processingError: null,
		})
		.where(eq(posts.id, id));
}
