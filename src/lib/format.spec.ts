import { describe, expect, it } from 'vitest';
import { kickoffDayParts } from './format.ts';

describe('kickoffDayParts', () => {
	const now = new Date('2026-10-18T12:00:00.000Z');

	it('shows only day and month in the current year', () => {
		expect(kickoffDayParts('2026-03-01T15:00:00.000Z', now)).toEqual({
			dayMonth: '01/03',
			year: null
		});
	});

	it('adds the year on its own when it is another year', () => {
		expect(kickoffDayParts('2021-11-28T15:00:00.000Z', now)).toEqual({
			dayMonth: '28/11',
			year: '2021'
		});
	});

	it('uses the Lisbon calendar day, not UTC', () => {
		// 23:30 UTC on 30 June is 00:30 on 1 July in Lisbon (summer time)
		expect(kickoffDayParts('2025-06-30T23:30:00.000Z', now)).toEqual({
			dayMonth: '01/07',
			year: '2025'
		});
	});
});
