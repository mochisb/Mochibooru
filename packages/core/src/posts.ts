import { and, asc, desc, eq, exists, inArray, notExists, sql, type SQL } from 'drizzle-orm';
import { getDb, posts, tags, postTags, favorites, postRevisions } from '@mochi/db';
import type { Database } from '@mochi/db';
import type { Actor } from '@mochi/shared';
import { parseSearch, type Comparison } from '@mochi/search';
import { canEditPost, canModerate } from './permissions';

export const PAGE_SIZE = 36;
export const favoriteCount = sql<number>`(select count(*)::int from ${favorites} where ${favorites.postId} = ${posts.id})`;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function setPostTags(tx: Transaction, postId: string, names: string[]) {
	// Stable order avoids conflicting unique-index locks during concurrent uploads.
	await tx
		.insert(tags)
		.values([...names].sort().map((name) => ({ name })))
		.onConflictDoNothing();
	const selected = await tx.select().from(tags).where(inArray(tags.name, names));
	await tx.delete(postTags).where(eq(postTags.postId, postId));
	await tx.insert(postTags).values(selected.map((tag) => ({ postId, tagId: tag.id })));
}

function dimension(column: typeof posts.width | typeof posts.height, comparison: Comparison) {
	const operators = { '=': sql`=`, '>': sql`>`, '>=': sql`>=`, '<': sql`<`, '<=': sql`<=` };
	return sql`${column} ${operators[comparison.operator]} ${comparison.value}`;
}

export function searchConditions(query: ReturnType<typeof parseSearch>) {
	const db = getDb();
	const conditions: SQL[] = [eq(posts.status, 'published')];
	if (query.rating !== 'any') conditions.push(eq(posts.rating, query.rating));
	const matchingTag = (name: string) =>
		db
			.select({ one: sql`1` })
			.from(postTags)
			.innerJoin(tags, eq(postTags.tagId, tags.id))
			.where(and(eq(postTags.postId, posts.id), eq(tags.name, name)));
	for (const name of query.include) conditions.push(exists(matchingTag(name)));
	for (const name of query.exclude) conditions.push(notExists(matchingTag(name)));
	if (query.width) conditions.push(dimension(posts.width, query.width));
	if (query.height) conditions.push(dimension(posts.height, query.height));
	if (query.type) conditions.push(eq(posts.animated, query.type === 'animated'));
	return conditions;
}

export async function attachTags<T extends { id: string }>(rows: T[]) {
	if (!rows.length) return [] as (T & { tags: (typeof tags.$inferSelect)[] })[];
	const attached = await getDb()
		.select({ postId: postTags.postId, tag: tags })
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(
			inArray(
				postTags.postId,
				rows.map((p) => p.id),
			),
		)
		.orderBy(asc(tags.name));
	return rows.map((post) => ({
		...post,
		tags: attached.filter((t) => t.postId === post.id).map((t) => t.tag),
	}));
}

export async function searchPosts(input: string, page = 1, favoriteUserId?: string) {
	const query = parseSearch(input);
	const conditions = searchConditions(query);
	if (favoriteUserId)
		conditions.push(
			exists(
				getDb()
					.select({ one: sql`1` })
					.from(favorites)
					.where(and(eq(favorites.postId, posts.id), eq(favorites.userId, favoriteUserId))),
			),
		);
	const order =
		query.sort === 'oldest'
			? [asc(posts.createdAt), asc(posts.id)]
			: query.sort === 'score'
				? [desc(favoriteCount), desc(posts.createdAt), desc(posts.id)]
				: [desc(posts.createdAt), desc(posts.id)];
	const rows = await getDb()
		.select()
		.from(posts)
		.where(and(...conditions))
		.orderBy(...order)
		.limit(PAGE_SIZE + 1)
		.offset((page - 1) * PAGE_SIZE);
	return {
		posts: await attachTags(rows.slice(0, PAGE_SIZE)),
		hasNext: rows.length > PAGE_SIZE,
		query,
	};
}

export async function popularTags(prefix = '') {
	return getDb()
		.select({
			id: tags.id,
			name: tags.name,
			category: tags.category,
			count: sql<number>`count(*)::int`,
		})
		.from(tags)
		.innerJoin(postTags, eq(tags.id, postTags.tagId))
		.innerJoin(posts, eq(posts.id, postTags.postId))
		.where(
			and(
				eq(posts.status, 'published'),
				eq(posts.rating, 'safe'),
				prefix ? sql`starts_with(${tags.name}, ${prefix})` : undefined,
			),
		)
		.groupBy(tags.id)
		.orderBy(desc(sql`count(*)`), asc(tags.name))
		.limit(12);
}

export async function editPost(
	actor: Actor,
	id: string,
	input: {
		title: string;
		source: string;
		rating: 'safe' | 'questionable' | 'explicit';
		tags: string[];
	},
	approval: boolean,
) {
	await getDb().transaction(async (tx) => {
		const [post] = await tx.select().from(posts).where(eq(posts.id, id)).for('update');
		if (!post || !canEditPost(actor, post))
			throw new Error('You do not have permission to edit this post.');
		const previous = await tx
			.select({ name: tags.name })
			.from(postTags)
			.innerJoin(tags, eq(tags.id, postTags.tagId))
			.where(eq(postTags.postId, id));
		const status = approval && !canModerate(actor) ? 'pending' : post.status;
		await tx
			.update(posts)
			.set({
				title: input.title,
				source: input.source,
				rating: input.rating,
				status,
				updatedAt: new Date(),
			})
			.where(eq(posts.id, id));
		await setPostTags(tx, id, input.tags);
		await tx.insert(postRevisions).values({
			postId: id,
			actorId: actor.id,
			action: 'edit',
			before: {
				title: post.title,
				source: post.source,
				rating: post.rating,
				tags: previous.map((t) => t.name),
			},
			after: input,
		});
	});
}

export async function moderatePost(actor: Actor, id: string, action: 'publish' | 'reject') {
	if (!canModerate(actor)) throw new Error('You do not have permission to moderate.');
	await getDb().transaction(async (tx) => {
		const [post] = await tx.select().from(posts).where(eq(posts.id, id)).for('update');
		if (!post || !['pending', 'published', 'rejected'].includes(post.status))
			throw new Error('The post has not been processed yet.');
		const status = action === 'publish' ? 'published' : 'rejected';
		await tx.update(posts).set({ status, updatedAt: new Date() }).where(eq(posts.id, id));
		await tx.insert(postRevisions).values({
			postId: id,
			actorId: actor.id,
			action,
			before: { status: post.status },
			after: { status },
		});
	});
}
