import { describe, expect, it } from 'vitest';
import {
	formatSeasonLabel,
	formatSeasonShort,
	isLegacyFullYearSlug,
	parseSeasonSlug,
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
