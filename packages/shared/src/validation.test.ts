import { expect, test } from 'bun:test';
import { parseTags, postInput } from './index';

test('normalizes and deduplicates tag names', () => {
	expect(parseTags(' CAT, cat 桜 pixel_art ')).toEqual(['cat', '桜', 'pixel_art']);
});
test('rejects ambiguous or unsearchable tag names', () => {
	expect(() => parseTags('-cat')).toThrow();
	expect(() => parseTags('rating:safe')).toThrow();
	expect(() => parseTags('')).toThrow();
	expect(() => parseTags(Array.from({ length: 51 }, (_, i) => `tag_${i}`).join(' '))).toThrow();
});
test('only permits HTTP sources', () => {
	expect(
		postInput.safeParse({ tags: 'cat', rating: 'safe', source: 'javascript:alert(1)' }).success,
	).toBe(false);
	expect(
		postInput.safeParse({ tags: 'cat', rating: 'safe', source: 'https://example.com/art' }).success,
	).toBe(true);
});
