import { describe, expect, it } from 'vitest';
import {
	allowScoreReports,
	competitionHref,
	dayRange,
	isDayListExtension,
	formResult,
	gameHref,
	gameStatus,
	hasStarted,
	headToHeadStats,
	isMvpVoteOpen,
	isValidDay,
	lisbonDayOf,
	lisbonDayRangeUtc
} from './games';

describe('isValidDay', () => {
	it('accepts real calendar days', () => {
		expect(isValidDay('2026-06-01')).toBe(true);
		expect(isValidDay('2024-02-29')).toBe(true);
	});

	it('rejects garbage and impossible dates', () => {
		expect(isValidDay('2026-6-1')).toBe(false);
		expect(isValidDay('2026-02-30')).toBe(false);
		expect(isValidDay('not-a-day')).toBe(false);
	});
});

describe('lisbonDayRangeUtc', () => {
	it('maps a winter (UTC+0) day to the same UTC bounds', () => {
		const range = lisbonDayRangeUtc('2026-01-15');
		expect(range.startNaive).toBe('2026-01-15 00:00:00');
		expect(range.endNaive).toBe('2026-01-16 00:00:00');
	});

	it('shifts a summer (WEST/UTC+1) day back by one hour', () => {
		const range = lisbonDayRangeUtc('2026-06-01');
		expect(range.startNaive).toBe('2026-05-31 23:00:00');
		// Next Lisbon midnight = 2026-06-02 00:00 WEST = 2026-06-01 23:00 UTC
		expect(range.endNaive).toBe('2026-06-01 23:00:00');
		expect(range.endMs - range.startMs).toBe(24 * 60 * 60 * 1000);
	});

	it('handles the spring-forward DST night (29 Mar 2026, last Sunday)', () => {
		// Clocks jump 01:00 → 02:00; 29 Mar is 23h long in Lisbon.
		const range = lisbonDayRangeUtc('2026-03-29');
		expect(range.startNaive).toBe('2026-03-29 00:00:00');
		expect(range.endNaive).toBe('2026-03-29 23:00:00');
		expect(range.endMs - range.startMs).toBe(23 * 60 * 60 * 1000);
	});
});

describe('lisbonDayOf', () => {
	it('returns the Lisbon calendar day for a UTC instant', () => {
		expect(lisbonDayOf('2026-06-01T22:30:00.000Z')).toBe('2026-06-01');
		expect(lisbonDayOf('2026-06-01T23:30:00.000Z')).toBe('2026-06-02');
	});
});

describe('gameStatus', () => {
	const kickoff = '2026-06-01T15:00:00.000Z';

	it('returns postponed and finished first', () => {
		expect(
			gameStatus({ kickoffIso: kickoff, finished: false, postponed: true }, new Date(kickoff))
		).toBe('postponed');
		expect(
			gameStatus({ kickoffIso: kickoff, finished: true, postponed: false }, new Date(kickoff))
		).toBe('finished');
	});

	it('is warmup in the 30 minutes before kickoff', () => {
		expect(
			gameStatus(
				{ kickoffIso: kickoff, finished: false, postponed: false },
				new Date('2026-06-01T14:30:00.000Z')
			)
		).toBe('warmup');
		expect(
			gameStatus(
				{ kickoffIso: kickoff, finished: false, postponed: false },
				new Date('2026-06-01T14:29:59.000Z')
			)
		).toBe('scheduled');
	});

	it('is live from kickoff until 3 hours after', () => {
		expect(
			gameStatus(
				{ kickoffIso: kickoff, finished: false, postponed: false },
				new Date('2026-06-01T15:00:00.000Z')
			)
		).toBe('live');
		expect(
			gameStatus(
				{ kickoffIso: kickoff, finished: false, postponed: false },
				new Date('2026-06-01T17:59:59.000Z')
			)
		).toBe('live');
		expect(
			gameStatus(
				{ kickoffIso: kickoff, finished: false, postponed: false },
				new Date('2026-06-01T18:00:00.000Z')
			)
		).toBe('scheduled');
	});

	it('keeps finished games out of the live window', () => {
		expect(
			gameStatus(
				{ kickoffIso: kickoff, finished: true, postponed: false },
				new Date('2026-06-01T16:00:00.000Z')
			)
		).toBe('finished');
	});
});

describe('hrefs', () => {
	it('builds competition and game URLs like the legacy site', () => {
		expect(
			competitionHref({
				startYear: 2025,
				endYear: 2026,
				displayName: '1ª Divisão AFPB'
			})
		).toBe('/competicoes/2025-26/1a-divisao-afpb');

		expect(
			gameHref({
				startYear: 2025,
				endYear: 2026,
				displayName: '1ª Divisão AFPB',
				groupName: 'Série A',
				round: 5,
				homeClubName: 'Sporting Clube de Braga B',
				awayClubName: 'Vitória Sport Clube'
			})
		).toBe(
			'/competicoes/2025-26/1a-divisao-afpb/serie-a/5/sporting-clube-de-braga-b-vs-vitoria-sport-clube'
		);
	});
});

describe('dayRange', () => {
	it('returns a contiguous inclusive range', () => {
		expect(dayRange('2026-06-10', 1, 1)).toEqual(['2026-06-09', '2026-06-10', '2026-06-11']);
	});
});

describe('isDayListExtension', () => {
	const base = ['2026-06-08', '2026-06-09', '2026-06-10'];

	it('treats prepends, appends, and the same list as extensions', () => {
		expect(isDayListExtension(base, ['2026-06-07', ...base])).toBe(true);
		expect(isDayListExtension(base, [...base, '2026-06-11'])).toBe(true);
		expect(isDayListExtension(base, base)).toBe(true);
	});

	it('rejects a window rebuilt around another day', () => {
		expect(isDayListExtension(base, ['2026-06-09', '2026-06-10', '2026-06-11'])).toBe(false);
		expect(isDayListExtension(base, ['2026-06-10'])).toBe(false);
		expect(isDayListExtension([], base)).toBe(false);
	});
});

describe('hasStarted / isMvpVoteOpen / allowScoreReports', () => {
	const kickoff = '2026-06-01T15:00:00.000Z';

	it('hasStarted is true after kickoff', () => {
		expect(hasStarted(kickoff, new Date('2026-06-01T15:00:00.000Z'))).toBe(false);
		expect(hasStarted(kickoff, new Date('2026-06-01T15:00:00.001Z'))).toBe(true);
	});

	it('opens MVP voting from +65min to +240min', () => {
		expect(isMvpVoteOpen(kickoff, new Date('2026-06-01T16:04:59.000Z'))).toBe(false);
		expect(isMvpVoteOpen(kickoff, new Date('2026-06-01T16:05:00.001Z'))).toBe(true);
		expect(isMvpVoteOpen(kickoff, new Date('2026-06-01T18:59:59.000Z'))).toBe(true);
		expect(isMvpVoteOpen(kickoff, new Date('2026-06-01T19:00:00.000Z'))).toBe(false);
	});

	it('allows score reports within 6h of kickoff after start', () => {
		expect(allowScoreReports(kickoff, new Date('2026-06-01T14:59:00.000Z'))).toBe(false);
		expect(allowScoreReports(kickoff, new Date('2026-06-01T15:00:00.001Z'))).toBe(true);
		expect(allowScoreReports(kickoff, new Date('2026-06-01T20:59:59.000Z'))).toBe(true);
		expect(allowScoreReports(kickoff, new Date('2026-06-01T21:00:00.000Z'))).toBe(false);
	});
});

describe('formResult', () => {
	const base = { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 };

	it('returns V/E/D for the given team', () => {
		expect(formResult(base, 1)).toBe('V');
		expect(formResult(base, 2)).toBe('D');
		expect(formResult({ ...base, homeScore: 1, awayScore: 1 }, 1)).toBe('E');
	});
});

describe('headToHeadStats', () => {
	it('aggregates from current home team perspective', () => {
		const stats = headToHeadStats(
			[
				{ homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 },
				{ homeTeamId: 2, awayTeamId: 1, homeScore: 1, awayScore: 0 },
				{ homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1 }
			],
			1
		);
		expect(stats.homeWins).toBe(1);
		expect(stats.draws).toBe(1);
		expect(stats.awayWins).toBe(1);
		expect(stats.total).toBe(3);
		expect(stats.homeWinPercent).toBeCloseTo(100 / 3, 5);
		expect(stats.drawPercent).toBeCloseTo(100 / 3, 5);
		expect(stats.awayWinPercent).toBeCloseTo(100 / 3, 5);
	});
});
