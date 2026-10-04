import { describe, expect, it } from 'vitest';
import {
	canMarkFinished,
	checkRateLimits,
	clampLocationAccuracy,
	clampScore,
	findMatchingBan,
	haversineMetres,
	isNearPlayground,
	isValidUuidCookie,
	parseOptionalCoord,
	ridiculousBanReason,
	safeReturnTo,
	validateScores,
	type ScoreReportBanRow
} from './score-reports.ts';

describe('canMarkFinished', () => {
	const kickoff = '2026-06-01T15:00:00.000Z';

	it('is false at or before 105 minutes', () => {
		expect(canMarkFinished(kickoff, new Date('2026-06-01T16:44:59.999Z'))).toBe(false);
		expect(canMarkFinished(kickoff, new Date('2026-06-01T16:45:00.000Z'))).toBe(false);
	});

	it('is true after 105 whole minutes', () => {
		expect(canMarkFinished(kickoff, new Date('2026-06-01T16:45:00.001Z'))).toBe(true);
	});
});

describe('validateScores / clampScore', () => {
	it('accepts 0–20 integers for a normal submit', () => {
		expect(validateScores(0, 0)).toEqual({ ok: true, homeScore: 0, awayScore: 0 });
		expect(validateScores(20, 1)).toEqual({ ok: true, homeScore: 20, awayScore: 1 });
	});

	it('rejects out of range and non-integers', () => {
		expect(validateScores(-1, 0).ok).toBe(false);
		expect(validateScores(33, 0)).toEqual({ ok: false, reason: 'invalid' });
		expect(validateScores(1.5, 0)).toEqual({ ok: false, reason: 'invalid' });
	});

	it('flags ridiculous scores over 20 for a ban', () => {
		expect(validateScores(21, 0)).toEqual({ ok: false, reason: 'ridiculous' });
		expect(validateScores(0, 32)).toEqual({ ok: false, reason: 'ridiculous' });
	});

	it('clamps the stepper to 0–31', () => {
		expect(clampScore(-2)).toBe(0);
		expect(clampScore(40)).toBe(31);
		expect(clampScore(12.9)).toBe(12);
	});
});

describe('safeReturnTo', () => {
	const origin = 'http://localhost:5173';
	const fallback = '/jogos';

	it('keeps same-site paths', () => {
		expect(safeReturnTo('/competicoes/foo', origin, fallback)).toBe('/competicoes/foo');
		expect(safeReturnTo('/a?x=1', origin, fallback)).toBe('/a?x=1');
	});

	it('keeps path from absolute URLs on this origin', () => {
		expect(safeReturnTo('http://localhost:5173/jogos?d=1', origin, fallback)).toBe('/jogos?d=1');
	});

	it('rejects open redirects', () => {
		expect(safeReturnTo('https://evil.example/phish', origin, fallback)).toBe(fallback);
		expect(safeReturnTo('//evil.example', origin, fallback)).toBe(fallback);
		expect(safeReturnTo('', origin, fallback)).toBe(fallback);
	});
});

describe('findMatchingBan', () => {
	const base: ScoreReportBanRow = {
		id: 1,
		userId: null,
		uuid: null,
		ipAddress: null,
		userAgent: null,
		shadowBan: false,
		ipBan: false,
		reason: 'test',
		expiresAt: '2099-01-01 00:00:00'
	};

	it('matches uuid or user id first', () => {
		expect(
			findMatchingBan([{ ...base, uuid: 'abc' }], {
				uuid: 'abc',
				userId: null,
				ipAddress: null,
				userAgent: null
			})?.id
		).toBe(1);

		expect(
			findMatchingBan([{ ...base, userId: 9 }], {
				uuid: 'other',
				userId: 9,
				ipAddress: null,
				userAgent: null
			})?.id
		).toBe(1);
	});

	it('matches IP when ip_ban or user-agent matches', () => {
		expect(
			findMatchingBan([{ ...base, ipAddress: '1.1.1.1', ipBan: true }], {
				uuid: 'x',
				userId: null,
				ipAddress: '1.1.1.1',
				userAgent: 'Mozilla'
			})?.id
		).toBe(1);

		expect(
			findMatchingBan(
				[{ ...base, ipAddress: '1.1.1.1', userAgent: 'Mozilla/5.0', ipBan: false }],
				{
					uuid: 'x',
					userId: null,
					ipAddress: '1.1.1.1',
					userAgent: 'Mozilla/5.0'
				}
			)?.id
		).toBe(1);

		expect(
			findMatchingBan(
				[{ ...base, ipAddress: '1.1.1.1', userAgent: 'Other', ipBan: false }],
				{
					uuid: 'x',
					userId: null,
					ipAddress: '1.1.1.1',
					userAgent: 'Mozilla/5.0'
				}
			)
		).toBeNull();
	});
});

describe('checkRateLimits', () => {
	it('blocks recent user, uuid, then ip', () => {
		expect(checkRateLimits({ recentByUser: true, recentByUuid: false, recentByIpCount: 0 })).toEqual(
			{ ok: false, reason: 'recent_user' }
		);
		expect(checkRateLimits({ recentByUser: false, recentByUuid: true, recentByIpCount: 0 })).toEqual(
			{ ok: false, reason: 'recent_uuid' }
		);
		expect(checkRateLimits({ recentByUser: false, recentByUuid: false, recentByIpCount: 3 })).toEqual(
			{ ok: false, reason: 'recent_ip' }
		);
		expect(checkRateLimits({ recentByUser: false, recentByUuid: false, recentByIpCount: 2 })).toEqual({
			ok: true
		});
	});
});

describe('haversine / near playground', () => {
	it('returns ~0 for the same point', () => {
		expect(haversineMetres(38.7, -9.1, 38.7, -9.1)).toBeCloseTo(0, 5);
	});

	it('is near within 150m and not beyond', () => {
		const pitch = { lat: 38.7, lon: -9.1 };
		// ~111m per 0.001° latitude
		expect(isNearPlayground({ lat: 38.7005, lon: -9.1 }, pitch)).toBe(true);
		expect(isNearPlayground({ lat: 38.702, lon: -9.1 }, pitch)).toBe(false);
	});
});

describe('coords and accuracy', () => {
	it('treats 0 as a valid coordinate', () => {
		expect(parseOptionalCoord(0)).toBe(0);
		expect(parseOptionalCoord('0')).toBe(0);
		expect(parseOptionalCoord('')).toBeNull();
		expect(parseOptionalCoord(undefined)).toBeNull();
	});

	it('caps accuracy at 1000m', () => {
		expect(clampLocationAccuracy(50)).toBe(50);
		expect(clampLocationAccuracy(5000)).toBe(1000);
		expect(clampLocationAccuracy(null)).toBeNull();
	});
});

describe('misc', () => {
	it('builds the Portuguese ridiculous-ban reason', () => {
		expect(ridiculousBanReason('A', 'B')).toBe('Envio de resultados falsos no jogo A vs B');
	});

	it('validates uuid cookie length', () => {
		expect(isValidUuidCookie('abc')).toBe(true);
		expect(isValidUuidCookie('')).toBe(false);
		expect(isValidUuidCookie('x'.repeat(37))).toBe(false);
	});
});
