import { searchPosts, popularTags } from '@mochi/core/posts';
import { SearchError } from '@mochi/search';
import { requireUser, pageNumber } from '$lib/server/http';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams.get('q') ?? '';
	const page = pageNumber(event.url.searchParams.get('page'));
	const favoriteUserId =
		event.url.searchParams.get('view') === 'favorites' ? requireUser(event).id : undefined;
	try {
		const [result, popular] = await Promise.all([
			searchPosts(q, page, favoriteUserId),
			popularTags(),
		]);
		return { ...result, popular, q, page, searchError: null, favoritesOnly: !!favoriteUserId };
	} catch (error) {
		if (!(error instanceof SearchError)) throw error;
		return {
			posts: [],
			hasNext: false,
			popular: [],
			q,
			page,
			searchError: error.message,
			favoritesOnly: !!favoriteUserId,
		};
	}
};
