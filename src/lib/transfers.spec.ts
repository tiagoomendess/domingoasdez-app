import { describe, expect, it } from 'vitest';
import {
	pickPreviousTransfer,
	transferDayBound,
	transferDayId,
	transferDayInstant,
	transferDayRange,
	transfersHref
} from './transfers.ts';

describe('transfer days', () => {
	it('builds ids, instants and links from a day', () => {
		expect(transferDayId('2026-09-02')).toBe(20260902);
		expect(transferDayInstant('2026-09-02')).toBe('2026-09-02T00:00:00.000Z');
		expect(transfersHref('2026-09-02')).toBe('/transferencias?date=2026-09-02');
	});

	it('ranges cover one UTC day, across month and year ends', () => {
		expect(transferDayRange('2026-09-02')).toEqual({
			startNaive: '2026-09-02 00:00:00',
			endNaive: '2026-09-03 00:00:00'
		});
		expect(transferDayRange('2026-02-28').endNaive).toBe('2026-03-01 00:00:00');
		expect(transferDayRange('2026-12-31').endNaive).toBe('2027-01-01 00:00:00');
	});
});

describe('transferDayBound', () => {
	it('starts from the newest day without a cursor', () => {
		expect(transferDayBound(null)).toBeNull();
	});

	it('moves past a day already shown', () => {
		expect(transferDayBound({ type: 'transfer', date: '2026-09-02T00:00:00.000Z' })).toBe(
			'2026-09-02'
		);
	});

	it("keeps a post's own day, since its transfers come after it", () => {
		expect(transferDayBound({ type: 'article', date: '2026-09-02T18:30:00.000Z' })).toBe(
			'2026-09-03'
		);
		expect(transferDayBound({ type: 'poll', date: '2026-12-31T00:00:00.000Z' })).toBe('2027-01-01');
	});
});

describe('pickPreviousTransfer', () => {
	const history = [
		{ id: 1, teamId: 10, date: '2024-08-01T00:00:00.000Z' },
		{ id: 2, teamId: null, date: '2025-01-15T00:00:00.000Z' },
		{ id: 3, teamId: 30, date: '2025-07-01T00:00:00.000Z' },
		{ id: 4, teamId: 40, date: '2025-07-01T00:00:00.000Z' }
	];

	it('returns the latest transfer strictly before the date', () => {
		expect(pickPreviousTransfer(history, '2025-03-01T00:00:00.000Z')?.id).toBe(2);
		expect(pickPreviousTransfer(history, '2025-07-01T00:00:00.000Z')?.id).toBe(2);
	});

	it('keeps a previous transfer to no club (team null)', () => {
		expect(pickPreviousTransfer(history, '2025-02-01T00:00:00.000Z')?.teamId).toBeNull();
	});

	it('breaks same-date ties by the higher id', () => {
		expect(pickPreviousTransfer(history, '2026-01-01T00:00:00.000Z')?.id).toBe(4);
	});

	it('returns null for a first transfer', () => {
		expect(pickPreviousTransfer(history, '2024-08-01T00:00:00.000Z')).toBeNull();
		expect(pickPreviousTransfer([], '2026-01-01T00:00:00.000Z')).toBeNull();
	});
});
