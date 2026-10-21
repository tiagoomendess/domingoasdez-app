import { describe, expect, it } from 'vitest';
import {
	formatSeasonLabel,
	formatSeasonShort,
	isLegacyFullYearSlug,
	parseRoundParams,
	parseSeasonSlug,
	roundParams,
	seasonNameSlug
} from './competitions.ts';

describe('formatSeasonLabel', () => {
	it('formats multi-year seasons', () => {
		expect(formatSeasonLabel(2025, 2026)).toBe('Época 2025/26');
		expect(formatSeasonLabel(2026, 2027)).toBe('Época 2026/27');
	});

	it('formats single-year seasons', () => {
		expect(formatSeasonLabel(2026, 2026)).toBe('Época 2026');
	});
});

describe('formatSeasonShort', () => {
	it('formats like legacy getName / formatSeasonLabel', () => {
		expect(formatSeasonShort(2025, 2026)).toBe('2025/26');
		expect(formatSeasonShort(2026, 2026)).toBe('2026');
	});
});

describe('seasonNameSlug', () => {
	it('matches legacy Season::getNameSlug', () => {
		expect(seasonNameSlug(2025, 2026)).toBe('2025-26');
		expect(seasonNameSlug(2026, 2026)).toBe('2026');
	});
});

describe('parseSeasonSlug', () => {
	it('parses single year', () => {
		expect(parseSeasonSlug('2025')).toEqual([2025, 2025]);
	});

	it('parses short form', () => {
		expect(parseSeasonSlug('2025-26')).toEqual([2025, 2026]);
	});

	it('parses full-year form', () => {
		expect(parseSeasonSlug('2025-2026')).toEqual([2025, 2026]);
	});

	it('wraps century on short form (1999-00)', () => {
		expect(parseSeasonSlug('1999-00')).toEqual([1999, 2000]);
	});

	it('returns null for invalid slugs', () => {
		expect(parseSeasonSlug('abc')).toBeNull();
		expect(parseSeasonSlug('25-26')).toBeNull();
	});
});

describe('isLegacyFullYearSlug', () => {
	it('detects YYYY-YYYY only', () => {
		expect(isLegacyFullYearSlug('2025-2026')).toBe(true);
		expect(isLegacyFullYearSlug('2025-26')).toBe(false);
		expect(isLegacyFullYearSlug('2025')).toBe(false);
	});
});

describe('round params', () => {
	const single = [{ id: 1, nameSlug: 'divisao-de-honra', rounds: [1, 2, 3, 4] }];
	const multi = [
		{ id: 1, nameSlug: 'serie-a', rounds: [1, 2, 3] },
		{ id: 2, nameSlug: 'serie-b', rounds: [1, 2, 3, 4] }
	];

	it('uses a bare round for a single group', () => {
		expect(parseRoundParams(['2'], single)).toEqual({ 1: 2 });
		expect(parseRoundParams(['divisao-de-honra.3'], single)).toEqual({ 1: 3 });
		expect(roundParams({ 1: 2 }, { 1: 4 }, single)).toEqual(['2']);
	});

	it('keys each group by its slug when there are several', () => {
		expect(parseRoundParams(['serie-a.2', 'serie-b.4'], multi)).toEqual({ 1: 2, 2: 4 });
		expect(roundParams({ 1: 2, 2: 4 }, { 1: 3, 2: 3 }, multi)).toEqual(['serie-a.2', 'serie-b.4']);
	});

	it('leaves out rounds that match the default', () => {
		expect(roundParams({ 1: 3, 2: 1 }, { 1: 3, 2: 3 }, multi)).toEqual(['serie-b.1']);
		expect(roundParams({ 1: 4 }, { 1: 4 }, single)).toEqual([]);
	});

	it('ignores unknown groups, rounds and junk', () => {
		expect(parseRoundParams(['2'], multi)).toEqual({});
		expect(parseRoundParams(['serie-c.2', 'serie-a.9', 'abc', ''], multi)).toEqual({});
		expect(parseRoundParams(['serie-a.2', 'serie-a.3'], multi)).toEqual({ 1: 2 });
	});
});
