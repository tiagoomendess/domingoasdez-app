import { describe, expect, it } from 'vitest';
import { firstAndLastName, isAdult, limitTransfers, playerAge, playerDisplayName } from './players';

describe('firstAndLastName', () => {
	it('keeps single-token names', () => {
		expect(firstAndLastName('Pelé')).toBe('Pelé');
	});

	it('takes first and last of a multi-part name', () => {
		expect(firstAndLastName('João Pedro Silva Costa')).toBe('João Costa');
	});

	it('trims whitespace', () => {
		expect(firstAndLastName('  Ana  Maria  ')).toBe('Ana Maria');
	});
});

describe('playerDisplayName', () => {
	it('appends nickname when present', () => {
		expect(playerDisplayName('João Pedro Silva', 'Jota')).toBe('João Silva (Jota)');
	});

	it('omits empty nickname', () => {
		expect(playerDisplayName('João Silva', '  ')).toBe('João Silva');
		expect(playerDisplayName('João Silva', null)).toBe('João Silva');
	});
});

describe('playerAge / isAdult', () => {
	const now = new Date('2026-06-15T12:00:00.000Z');

	it('returns null for missing birth date', () => {
		expect(playerAge(null, now)).toBeNull();
		expect(isAdult(null, now)).toBe(false);
	});

	it('computes full years', () => {
		expect(playerAge('2000-06-15T00:00:00.000Z', now)).toBe(26);
		expect(playerAge('2008-06-16T00:00:00.000Z', now)).toBe(17);
		expect(playerAge('2008-06-15T00:00:00.000Z', now)).toBe(18);
	});

	it('isAdult at 18+', () => {
		expect(isAdult('2008-06-15T00:00:00.000Z', now)).toBe(true);
		expect(isAdult('2008-06-16T00:00:00.000Z', now)).toBe(false);
	});
});

describe('limitTransfers', () => {
	const items = [1, 2, 3, 4, 5];

	it('returns the full list for logged-in users', () => {
		expect(limitTransfers(items, false)).toEqual({ shown: items, remaining: 0 });
	});

	it('caps guests at 2 and reports the remainder', () => {
		expect(limitTransfers(items, true)).toEqual({ shown: [1, 2], remaining: 3 });
	});

	it('does not truncate when the guest list is short enough', () => {
		expect(limitTransfers([1, 2], true)).toEqual({ shown: [1, 2], remaining: 0 });
		expect(limitTransfers([1], true)).toEqual({ shown: [1], remaining: 0 });
	});
});
