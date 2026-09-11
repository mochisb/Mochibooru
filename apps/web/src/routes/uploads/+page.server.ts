import { desc, eq } from 'drizzle-orm';
import { getDb, posts } from '@mochi/db';
import { attachTags, PAGE_SIZE } from '@mochi/core/posts';
import { requireUser, pageNumber } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireUser(event);
	const page = pageNumber(event.url.searchParams.get('page'));
	const rows = await getDb()
		.select()
		.from(posts)
		.where(eq(posts.uploaderId, actor.id))
		.orderBy(desc(posts.createdAt), desc(posts.id))
		.limit(PAGE_SIZE + 1)
		.offset((page - 1) * PAGE_SIZE);
	return {
		posts: await attachTags(rows.slice(0, PAGE_SIZE)),
		hasNext: rows.length > PAGE_SIZE,
		page,
	};
};
