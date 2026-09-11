import { tagName, ratings } from '@mochi/shared';

export class SearchError extends Error {}
export type Comparison = { operator: '=' | '>' | '>=' | '<' | '<='; value: number };
export type SearchQuery = {
	include: string[];
	exclude: string[];
	rating: 'safe' | 'questionable' | 'explicit' | 'any';
	type?: 'image' | 'animated';
	width?: Comparison;
	height?: Comparison;
	sort: 'newest' | 'oldest' | 'score';
};

export function parseSearch(input: string): SearchQuery {
	if (input.length > 512) throw new SearchError('Search queries can contain up to 512 characters.');
	const tokens = input.trim().split(/\s+/).filter(Boolean);
	if (tokens.length > 32) throw new SearchError('Use at most 32 terms per search.');
	const result: SearchQuery = { include: [], exclude: [], rating: 'safe', sort: 'newest' };
	const filters = new Set<string>();
	for (const raw of tokens) {
		const token = raw.toLowerCase();
		if (token.includes(':')) {
			const [key, value, extra] = token.split(':');
			if (!value || extra !== undefined) throw new SearchError(`Invalid filter: ${raw}`);
			if (filters.has(key)) throw new SearchError(`The ${key} filter is repeated.`);
			filters.add(key);
			if (key === 'rating' && [...ratings, 'any'].includes(value))
				result.rating = value as SearchQuery['rating'];
			else if (key === 'sort' && ['newest', 'oldest', 'score'].includes(value))
				result.sort = value as SearchQuery['sort'];
			else if (key === 'type' && ['image', 'animated'].includes(value))
				result.type = value as SearchQuery['type'];
			else if (key === 'width' || key === 'height') {
				const match = value.match(/^(>=|<=|>|<|=)?([1-9]\d{0,5})$/);
				if (!match) throw new SearchError(`Use ${key}:>=1920 or a dimension between 1 and 999999.`);
				result[key] = {
					operator: (match[1] || '=') as Comparison['operator'],
					value: Number(match[2]),
				};
			} else throw new SearchError(`Unknown filter: ${raw}. See the search help.`);
		} else {
			const excluded = token.startsWith('-');
			const parsed = tagName.safeParse(excluded ? token.slice(1) : token);
			if (!parsed.success || parsed.data.startsWith('-'))
				throw new SearchError(`Invalid tag: ${raw}`);
			const list = excluded ? result.exclude : result.include;
			if (!list.includes(parsed.data)) list.push(parsed.data);
		}
	}
	return result;
}
