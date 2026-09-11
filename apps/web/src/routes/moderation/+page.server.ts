import { asc, eq } from 'drizzle-orm';
import { getDb, posts } from '@mochi/db';
import { attachTags, PAGE_SIZE } from '@mochi/core/posts';
import { requireModerator, pageNumber } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireModerator(event);
	const page = pageNumber(event.url.searchParams.get('page'));
	const rows = await getDb()
		.select()
		.from(posts)
		.where(eq(posts.status, 'pending'))
		.orderBy(asc(posts.createdAt), asc(posts.id))
		.limit(PAGE_SIZE + 1)
		.offset((page - 1) * PAGE_SIZE);
	return {
		posts: await attachTags(rows.slice(0, PAGE_SIZE)),
		hasNext: rows.length > PAGE_SIZE,
		page,
	};
};
