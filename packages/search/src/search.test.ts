import { describe, expect, test } from 'bun:test';
import { parseSearch, SearchError } from './index';

describe('booru search language', () => {
	test('intersects tags, normalizes case and excludes negatives', () => {
		const query = parseSearch('Cat cat landscape -DOG');
		expect(query.include).toEqual(['cat', 'landscape']);
		expect(query.exclude).toEqual(['dog']);
		expect(query.rating).toBe('safe');
	});
	test('parses dimensions, explicit rating and sorting', () => {
		expect(
			parseSearch('width:>=1920 height:<2000 rating:any type:animated sort:score'),
		).toMatchObject({
			width: { operator: '>=', value: 1920 },
			height: { operator: '<', value: 2000 },
			rating: 'any',
			type: 'animated',
			sort: 'score',
		});
	});
	test('supports Unicode and exact dimensions', () => {
		expect(parseSearch('桜 width:640').include).toEqual(['桜']);
		expect(parseSearch('width:640').width).toEqual({ operator: '=', value: 640 });
	});
	test.each([
		'sort:random',
		'rating:unknown',
		'width:0',
		'height:1e9',
		'width:>=',
		'width:1:2',
		"cat' OR 1=1",
		'rating:any rating:safe',
		'-',
	])('rejects invalid input: %s', (input) => {
		expect(() => parseSearch(input)).toThrow(SearchError);
	});
	test('caps query complexity', () => {
		expect(() => parseSearch('a'.repeat(513))).toThrow(SearchError);
		expect(() => parseSearch(Array(33).fill('cat').join(' '))).toThrow(SearchError);
	});
});
