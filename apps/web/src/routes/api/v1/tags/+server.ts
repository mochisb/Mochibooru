import { json } from '@sveltejs/kit';
import { popularTags } from '@mochi/core/posts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const prefix = (url.searchParams.get('q') ?? '').toLowerCase().trim();
	if (prefix.length > 80) return json({ tags: [] });
	return json(
		{ tags: await popularTags(prefix) },
		{ headers: { 'cache-control': 'public, max-age=30' } },
	);
};
