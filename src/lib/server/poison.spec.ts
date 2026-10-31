import { describe, expect, it } from 'vitest';
import { fakeScore, kickoffShiftMinutes, poisonData, shiftDate } from './poison';

const ids = Array.from({ length: 200 }, (_, i) => i + 1);

describe('fakeScore', () => {
	it('is the same for the same game and score', () => {
		expect(fakeScore(42, 2, 1)).toEqual(fakeScore(42, 2, 1));
	});

	it('changes most scores by one goal a side, never below zero', () => {
		const changed = ids.filter((id) => {
			const [home, away] = fakeScore(id, 1, 0);
			expect(home).toBeGreaterThanOrEqual(0);
			expect(away).toBeGreaterThanOrEqual(0);
			expect(Math.abs(home - 1)).toBeLessThanOrEqual(1);
			expect(Math.abs(away - 0)).toBeLessThanOrEqual(1);
			return home !== 1 || away !== 0;
		});
		expect(changed.length).toBeGreaterThan(100);
		expect(changed.length).toBeLessThan(190);
	});
});

describe('shiftDate', () => {
	it('keeps the format', () => {
		expect(shiftDate('2026-10-31T15:00:00.000Z', 30)).toBe('2026-10-31T15:30:00.000Z');
		expect(shiftDate('2026-10-31 15:00:00', -15)).toBe('2026-10-31 14:45:00');
		expect(shiftDate(new Date('2026-10-31T15:00:00Z'), 60)).toEqual(
			new Date('2026-10-31T16:00:00Z')
		);
		expect(shiftDate('not a date', 30)).toBe('not a date');
	});
});

describe('poisonData', () => {
	const match = (id: number, status = 'finished') => ({
		id,
		href: `/g/${id}`,
		status,
		kickoff: '2026-10-31T15:00:00.000Z',
		home: { name: 'A' },
		away: { name: 'B' },
		homeScore: 2,
		awayScore: 1,
		penalties: null
	});

	it('never changes the original', () => {
		const data = { games: [match(1)] };
		const copy = JSON.stringify(data);
		poisonData(data);
		expect(JSON.stringify(data)).toBe(copy);
	});

	it('poisons a game the same way wherever it appears', () => {
		const changedId = ids.find((id) => fakeScore(id, 2, 1).join() !== '2,1')!;
		const shared = match(changedId);
		const out = poisonData({ day: [shared], game: { ...match(changedId) }, again: shared });
		expect(out.day[0].homeScore).toBe(out.game.homeScore);
		expect(out.day[0].awayScore).toBe(out.game.awayScore);
		expect(`${out.day[0].homeScore},${out.day[0].awayScore}`).not.toBe('2,1');
		// The same object twice is poisoned once.
		expect(out.again).toBe(out.day[0]);
		expect(out.day[0].kickoff).toBe(out.game.kickoff);
	});

	it('leaves the placeholder score of games not played yet', () => {
		const out = poisonData(
			ids.map((id) => ({ ...match(id, 'scheduled'), homeScore: 0, awayScore: 0 }))
		);
		expect(out.every((m) => m.homeScore === 0 && m.awayScore === 0)).toBe(true);
		expect(out.some((m) => m.kickoff !== '2026-10-31T15:00:00.000Z')).toBe(true);
	});

	it('moves kick-offs by up to an hour, in quarters', () => {
		for (const id of ids) {
			expect(Math.abs(kickoffShiftMinutes(id))).toBeLessThanOrEqual(60);
			expect(kickoffShiftMinutes(id) % 15 === 0).toBe(true);
		}
	});

	it('fits the game page scorers to the fake score', () => {
		const goal = (id: number, minute: number) => ({ id, minute, playerName: `P${id}` });
		for (const id of ids.slice(0, 50)) {
			const out = poisonData({
				...match(id),
				showScore: true,
				homeGoals: [goal(1, 10), goal(2, 50)],
				awayGoals: [goal(3, 70)],
				h2hStats: null
			});
			expect(out.homeGoals).toHaveLength(out.homeScore);
			expect(out.awayGoals).toHaveLength(out.awayScore);
			const minutes = out.homeGoals.map((g) => g.minute);
			expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
		}
	});

	it('follows the fake score in the form chips and the standings', () => {
		const changedId = ids.find((id) => fakeScore(id, 2, 1).join() !== '2,1')!;
		const out = poisonData({
			form: { result: 'V', side: 'home', match: match(changedId) },
			group: {
				id: 9,
				rounds: [
					{
						number: 1,
						games: [{ finished: true, homeScore: 2, awayScore: 1, match: match(changedId) }]
					}
				],
				standingsGroup: {
					name: 'G',
					rounds: [{ number: 1, games: [{ finished: true, homeScore: 2, awayScore: 1 }] }]
				}
			}
		});
		const { homeScore, awayScore } = out.form.match;
		expect(out.form.result).toBe(homeScore === awayScore ? 'E' : homeScore > awayScore ? 'V' : 'D');
		expect(out.group.rounds[0].games[0].homeScore).toBe(homeScore);
		expect(out.group.standingsGroup.rounds[0].games[0]).toEqual({
			finished: true,
			homeScore,
			awayScore
		});
	});

	it('keeps head-to-head totals', () => {
		for (const id of ids.slice(0, 50)) {
			const out = poisonData({
				...match(id),
				h2hStats: {
					homeWins: 3,
					draws: 1,
					awayWins: 2,
					total: 6,
					homeWinPercent: 50,
					drawPercent: 0,
					awayWinPercent: 0
				}
			});
			const { homeWins, draws, awayWins } = out.h2hStats;
			expect(homeWins + draws + awayWins).toBe(6);
		}
	});

	it('nudges top scorers and keeps them sorted', () => {
		const scorers = ids
			.slice(0, 20)
			.map((playerId) => ({ playerId, shortName: `P${playerId}`, goals: 30 - playerId }));
		const out = poisonData({ scorers });
		const goals = out.scorers.map((s) => s.goals);
		expect(goals).toEqual([...goals].sort((a, b) => b - a));
		expect(goals.join()).not.toBe(scorers.map((s) => s.goals).join());
	});

	it('poisons the legacy API shape', () => {
		const changedId = ids.find((id) => fakeScore(id, 2, 1).join() !== '2,1')!;
		const [out] = poisonData([
			{ id: changedId, date: '2026-10-31 15:00:00', started: true, home_score: 2, away_score: 1 }
		]);
		expect(`${out.home_score},${out.away_score}`).not.toBe('2,1');
	});
});
