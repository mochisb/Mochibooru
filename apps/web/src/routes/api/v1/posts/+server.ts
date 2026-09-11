import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { getDb, posts, postRevisions } from '@mochi/db';
import { postInput } from '@mochi/shared';
import { getConfig } from '@mochi/shared/config';
import { getStorage } from '@mochi/storage';
import { searchPosts, setPostTags } from '@mochi/core/posts';
import { SearchError } from '@mochi/search';
import { requireUser, requireSameOrigin, pageNumber } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const result = await searchPosts(
			url.searchParams.get('q') ?? '',
			pageNumber(url.searchParams.get('page')),
		);
		return json({
			posts: result.posts.map(
				({ originalKey, thumbnailKey, previewKey, processingError, sha256, ...post }) => ({
					...post,
					thumbnailUrl: `/media/${post.id}/thumbnail`,
					previewUrl: `/media/${post.id}/preview`,
				}),
			),
			hasNext: result.hasNext,
		});
	} catch (cause) {
		if (cause instanceof SearchError) error(400, cause.message);
		throw cause;
	}
};

export const POST: RequestHandler = async (event) => {
	requireSameOrigin(event);
	const actor = requireUser(event);
	const maxBytes = getConfig().MAX_UPLOAD_MB * 1024 * 1024;
	const declaredSize = Number(event.request.headers.get('content-length'));
	if (declaredSize > maxBytes + 65536)
		error(413, `El archivo supera ${getConfig().MAX_UPLOAD_MB} MB.`);
	// Read with an actual byte ceiling, including requests using chunked encoding.
	if (!event.request.body) error(400, 'Falta el archivo.');
	const reader = event.request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const chunk = await reader.read();
		if (chunk.done) break;
		size += chunk.value.byteLength;
		if (size > maxBytes + 65536) {
			await reader.cancel();
			error(413, 'La subida supera el tamaño permitido.');
		}
		chunks.push(chunk.value);
	}
	let data: FormData;
	try {
		data = await new Response(Buffer.concat(chunks), {
			headers: { 'content-type': event.request.headers.get('content-type') ?? '' },
		}).formData();
	} catch {
		error(400, 'Formulario multipart inválido.');
	}
	const file = data.get('file');
	if (!(file instanceof File) || file.size < 1) error(400, 'Selecciona una imagen.');
	if (file.size > maxBytes) error(413, `El archivo supera ${getConfig().MAX_UPLOAD_MB} MB.`);
	const parsed = postInput.safeParse(Object.fromEntries(data));
	if (!parsed.success) error(400, parsed.error.issues[0].message);
	const input = parsed.data;
	const bytes = new Uint8Array(await file.arrayBuffer());
	const hash = createHash('sha256').update(bytes).digest('hex');
	const id = randomUUID();
	const originalKey = `originals/${id}.bin`;
	const storage = getStorage();
	await storage.put(originalKey, bytes, 'application/octet-stream');
	let created = false;
	try {
		await getDb().transaction(async (tx) => {
			// Serialize per-account quota checks to prevent parallel-upload bypasses.
			await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${actor.id}))`);
			const [recent] = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(posts)
				.where(
					and(
						eq(posts.uploaderId, actor.id),
						gte(posts.createdAt, new Date(Date.now() - 3600_000)),
					),
				);
			if (recent.count >= 100) error(429, 'Has alcanzado el límite de 100 subidas por hora.');
			const inserted = await tx
				.insert(posts)
				.values({
					id,
					uploaderId: actor.id,
					title: input.title,
					source: input.source,
					rating: input.rating,
					sha256: hash,
					originalKey,
					bytes: bytes.byteLength,
				})
				.onConflictDoNothing({ target: posts.sha256 })
				.returning({ id: posts.id });
			if (!inserted.length) error(409, 'Este archivo ya existe en la colección.');
			await setPostTags(tx, id, input.tags);
			await tx
				.insert(postRevisions)
				.values({ postId: id, actorId: actor.id, action: 'upload', after: input });
		});
		created = true;
	} finally {
		if (!created) await storage.delete(originalKey);
	}
	return json({ id, status: 'queued', url: `/posts/${id}` }, { status: 201 });
};
