import { describe, expect, it } from 'vitest';
import {
	isNumeric,
	phpJsonEncode,
	phpJsonString,
	phpTrim,
	phpUsort,
	samePrefixBytes,
	strLimit,
	strlen,
	strtolower
} from './php.ts';

describe('php byte helpers', () => {
	it('measures UTF-8 bytes like strlen', () => {
		expect(strlen('Gião')).toBe(5);
		expect(strlen('1ª')).toBe(3);
	});

	it('lowercases ASCII only, like strtolower in the C locale', () => {
		expect(strtolower('ÁGUIAS Fc')).toBe('Águias fc');
	});

	it('compares byte prefixes', () => {
		expect(samePrefixBytes('gião', 'gil', 3)).toBe(false);
		expect(samePrefixBytes('giao', 'gia', 3)).toBe(true);
		expect(samePrefixBytes('ação', 'aço', 3)).toBe(true);
	});

	it('trims the PHP character list only', () => {
		expect(phpTrim('  x \t\n')).toBe('  x');
	});
});

describe('Str::limit', () => {
	it('keeps short values and cuts long ones with the end marker', () => {
		expect(strLimit('api_scraper', 25, '')).toBe('api_scraper');
		expect(strLimit('api_a_very_long_source_name_here', 25, '')).toBe('api_a_very_long_source_na');
		expect(strLimit('abc   def', 4)).toBe('abc...');
	});
});

describe('json_encode', () => {
	const BS = String.fromCharCode(92);

	it('escapes slashes and non-ASCII like PHP', () => {
		// The output of PHP 7.4 json_encode() for the same string.
		const php = ['"a', '/', 'u00e9', '"', 'ud83d', 'ude00', 'n"'].join(BS);
		expect(phpJsonString('a/é"😀\n')).toBe(php);
	});

	it('turns empty and 0…n-1 keyed objects into lists', () => {
		const php = '{"x":[],"y":["a","b"],"z":1.5,"w":"' + BS + 'u00e7' + BS + '/"}';
		expect(phpJsonEncode({ x: {}, y: { 0: 'a', 1: 'b' }, z: 1.5, w: 'ç/' })).toBe(php);
	});
});

describe('is_numeric', () => {
	it('accepts PHP 7 numeric strings', () => {
		expect(['1', ' 1.5', '-.5', '1e3', 2].every(isNumeric)).toBe(true);
		expect(['1 ', 'abc', '', '0x1A', true].some(isNumeric)).toBe(false);
	});
});

/** What PHP 7.4 usort() returns for the same input (computed in the legacy container). */
const PHP_ORDER = [0, 8, 17, 14, 5, 11, 16, 13, 10, 7, 4, 2, 19, 9, 1, 12, 6, 15, 3, 18];

describe('usort', () => {
	it('orders ties like PHP 7.4 zend_sort', () => {
		const items = [3, 1, 2, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2].map((score, id) => ({
			id,
			score
		}));
		phpUsort(items, (a, b) => Math.sign(b.score - a.score));
		expect(items.map((x) => x.id)).toEqual(PHP_ORDER);
	});
});
