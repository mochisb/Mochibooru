import { error, fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, posts, user, favorites, postRevisions } from '@mochi/db';
import { attachTags, editPost, moderatePost, favoriteCount } from '@mochi/core/posts';
import { canViewPost, canEditPost, canModerate } from '@mochi/core/permissions';
import { postInput } from '@mochi/shared';
import { getConfig } from '@mochi/shared/config';
import { postId, requireUser, requireModerator } from '$lib/server/http';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [row] = await getDb()
		.select({ post: posts, uploader: user.name, score: favoriteCount })
		.from(posts)
		.innerJoin(user, eq(user.id, posts.uploaderId))
		.where(eq(posts.id, postId(params.id)));
	if (!row || !canViewPost(locals.user, row.post)) error(404, 'Publicación no encontrada.');
	const [post] = await attachTags([row.post]);
	const saved = locals.user
		? await getDb()
				.select()
				.from(favorites)
				.where(and(eq(favorites.postId, post.id), eq(favorites.userId, locals.user.id)))
		: [];
	const revisions = await getDb()
		.select({
			id: postRevisions.id,
			action: postRevisions.action,
			createdAt: postRevisions.createdAt,
			actor: user.name,
			before: postRevisions.before,
			after: postRevisions.after,
		})
		.from(postRevisions)
		.innerJoin(user, eq(user.id, postRevisions.actorId))
		.where(eq(postRevisions.postId, post.id))
		.orderBy(desc(postRevisions.createdAt))
		.limit(20);
	return {
		post,
		uploader: row.uploader,
		score: row.score,
		saved: !!saved.length,
		revisions,
		canEdit: canEditPost(locals.user, post),
		canModerate: canModerate(locals.user),
	};
};

export const actions: Actions = {
	edit: async (event) => {
		const actor = requireUser(event);
		const input = postInput.safeParse(Object.fromEntries(await event.request.formData()));
		if (!input.success) return fail(400, { message: input.error.issues[0].message });
		try {
			await editPost(actor, postId(event.params.id), input.data, getConfig().REQUIRE_APPROVAL);
		} catch (cause) {
			if (cause instanceof Error && cause.message.startsWith('No tienes'))
				return fail(403, { message: cause.message });
			throw cause;
		}
		return { message: 'Publicación actualizada.' };
	},
	favorite: async (event) => {
		const actor = requireUser(event);
		const id = postId(event.params.id);
		const [post] = await getDb().select().from(posts).where(eq(posts.id, id));
		if (!post || !canViewPost(actor, post)) error(404, 'Publicación no encontrada.');
		const data = await event.request.formData();
		if (data.get('saved') === 'true')
			await getDb()
				.insert(favorites)
				.values({ userId: actor.id, postId: id })
				.onConflictDoNothing();
		else
			await getDb()
				.delete(favorites)
				.where(and(eq(favorites.userId, actor.id), eq(favorites.postId, id)));
		return { message: null };
	},
	moderate: async (event) => {
		const actor = requireModerator(event);
		const action = (await event.request.formData()).get('action');
		if (action !== 'publish' && action !== 'reject')
			return fail(400, { message: 'Acción inválida.' });
		try {
			await moderatePost(actor, postId(event.params.id), action);
		} catch (cause) {
			if (cause instanceof Error && cause.message.startsWith('La publicación'))
				return fail(409, { message: cause.message });
			throw cause;
		}
		return {
			message:
				action === 'publish' ? 'Publicación aprobada.' : 'Publicación retirada de la galería.',
		};
	},
	retry: async (event) => {
		const actor = requireUser(event);
		const id = postId(event.params.id);
		const [post] = await getDb().select().from(posts).where(eq(posts.id, id));
		if (!post || !(actor.id === post.uploaderId || canModerate(actor)))
			error(404, 'Publicación no encontrada.');
		if (post.status !== 'failed')
			return fail(409, { message: 'Solo se pueden reintentar subidas fallidas.' });
		if (Date.now() - post.updatedAt.getTime() < 60_000)
			return fail(429, { message: 'Espera un minuto antes de reintentar.' });
		await getDb()
			.update(posts)
			.set({ status: 'queued', processingError: null, updatedAt: new Date() })
			.where(and(eq(posts.id, id), eq(posts.status, 'failed')));
		return { message: 'La imagen vuelve a estar en la cola.' };
	},
};
