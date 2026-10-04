import { describe, expect, it } from 'vitest';
import { naiveToIso } from './dates';

describe('naiveToIso', () => {
	it('parses MySQL datetime strings as UTC', () => {
		expect(naiveToIso('2026-06-01 12:30:45')).toBe('2026-06-01T12:30:45.000Z');
		expect(naiveToIso('2026-06-01T12:30:45')).toBe('2026-06-01T12:30:45.000Z');
		expect(naiveToIso('2026-06-01 12:30')).toBe('2026-06-01T12:30:00.000Z');
	});

	it('passes through Date objects', () => {
		const d = new Date('2026-06-01T12:30:45.000Z');
		expect(naiveToIso(d)).toBe('2026-06-01T12:30:45.000Z');
	});

	it('accepts ISO strings that already have a zone', () => {
		expect(naiveToIso('2026-06-01T12:30:45.000Z')).toBe('2026-06-01T12:30:45.000Z');
	});

	it('rejects zero dates and garbage', () => {
		expect(() => naiveToIso('0000-00-00 00:00:00')).toThrow(RangeError);
		expect(() => naiveToIso('not a date')).toThrow(RangeError);
		expect(() => naiveToIso(new Date(Number.NaN))).toThrow(RangeError);
	});
});
