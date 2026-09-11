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
	if (input.length > 512) throw new SearchError('La búsqueda admite hasta 512 caracteres.');
	const tokens = input.trim().split(/\s+/).filter(Boolean);
	if (tokens.length > 32) throw new SearchError('Usa un máximo de 32 términos por búsqueda.');
	const result: SearchQuery = { include: [], exclude: [], rating: 'safe', sort: 'newest' };
	const filters = new Set<string>();
	for (const raw of tokens) {
		const token = raw.toLowerCase();
		if (token.includes(':')) {
			const [key, value, extra] = token.split(':');
			if (!value || extra !== undefined) throw new SearchError(`Filtro inválido: ${raw}`);
			if (filters.has(key)) throw new SearchError(`El filtro ${key} está repetido.`);
			filters.add(key);
			if (key === 'rating' && [...ratings, 'any'].includes(value))
				result.rating = value as SearchQuery['rating'];
			else if (key === 'sort' && ['newest', 'oldest', 'score'].includes(value))
				result.sort = value as SearchQuery['sort'];
			else if (key === 'type' && ['image', 'animated'].includes(value))
				result.type = value as SearchQuery['type'];
			else if (key === 'width' || key === 'height') {
				const match = value.match(/^(>=|<=|>|<|=)?([1-9]\d{0,5})$/);
				if (!match) throw new SearchError(`Usa ${key}:>=1920 o una dimensión entre 1 y 999999.`);
				result[key] = {
					operator: (match[1] || '=') as Comparison['operator'],
					value: Number(match[2]),
				};
			} else throw new SearchError(`Filtro no reconocido: ${raw}. Consulta la ayuda del buscador.`);
		} else {
			const excluded = token.startsWith('-');
			const parsed = tagName.safeParse(excluded ? token.slice(1) : token);
			if (!parsed.success || parsed.data.startsWith('-'))
				throw new SearchError(`Etiqueta inválida: ${raw}`);
			const list = excluded ? result.exclude : result.include;
			if (!list.includes(parsed.data)) list.push(parsed.data);
		}
	}
	return result;
}
