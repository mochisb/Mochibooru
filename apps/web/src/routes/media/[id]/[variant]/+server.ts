import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb, posts } from '@mochi/db';
import { canViewPost } from '@mochi/core/permissions';
import { getStorage } from '@mochi/storage';
import { postId } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, request }) => {
	const [post] = await getDb()
		.select()
		.from(posts)
		.where(eq(posts.id, postId(params.id)));
	if (!post || !canViewPost(locals.user, post)) error(404, 'Archivo no encontrado.');
	const variant = params.variant;
	const key =
		variant === 'thumbnail'
			? post.thumbnailKey
			: variant === 'preview'
				? post.previewKey
				: variant === 'original' && post.mime
					? post.originalKey
					: null;
	if (!key) error(404, 'Archivo no disponible.');
	const etag = `"${post.sha256}-${variant}"`;
	const headers: Record<string, string> = {
		'content-type': variant === 'original' ? post.mime! : 'image/webp',
		'cache-control': 'private, no-cache',
		'x-content-type-options': 'nosniff',
		etag,
	};
	if (request.headers.get('if-none-match') === etag)
		return new Response(null, { status: 304, headers });
	const object = await getStorage().stream(key);
	headers['content-length'] = String(object.size);
	return new Response(object.body, { headers });
};
