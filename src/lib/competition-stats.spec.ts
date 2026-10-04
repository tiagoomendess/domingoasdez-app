import { describe, expect, it } from 'vitest';
import {
	buildPlayerHref,
	firstAndLastName,
	rankAttack,
	rankDefense,
	rankScorers,
	shuffleClubs,
	type TeamGoalInput
} from './competition-stats.ts';

describe('firstAndLastName', () => {
	it('returns first and last of a multi-part name', () => {
		expect(firstAndLastName('João Pedro Silva Costa')).toBe('João Costa');
	});

	it('returns the single token unchanged', () => {
		expect(firstAndLastName('Pelé')).toBe('Pelé');
	});

	it('handles empty input', () => {
		expect(firstAndLastName('')).toBe('');
		expect(firstAndLastName('   ')).toBe('');
	});
});

describe('buildPlayerHref', () => {
	it('matches legacy /jogadores/{id}/{slug}', () => {
		expect(buildPlayerHref(42, 'João Silva')).toBe('/jogadores/42/joao-silva');
	});
});

describe('rankScorers', () => {
	it('excludes own goals and null players', () => {
		const ranked = rankScorers([
			{ playerId: 1, ownGoal: false },
			{ playerId: 1, ownGoal: false },
			{ playerId: 1, ownGoal: true },
			{ playerId: 2, ownGoal: false },
			{ playerId: null, ownGoal: false }
		]);
		expect(ranked).toEqual([
			{ playerId: 1, goals: 2 },
			{ playerId: 2, goals: 1 }
		]);
	});

	it('respects the limit', () => {
		const goals = Array.from({ length: 20 }, (_, i) => ({
			playerId: i + 1,
			ownGoal: false
		}));
		expect(rankScorers(goals, 5)).toHaveLength(5);
	});

	it('returns empty when there are no valid goals', () => {
		expect(rankScorers([])).toEqual([]);
		expect(rankScorers([{ playerId: null, ownGoal: false }])).toEqual([]);
	});
});

function team(
	partial: Partial<TeamGoalInput> & Pick<TeamGoalInput, 'teamId' | 'clubName' | 'goalsFor' | 'goalsAgainst'>
): TeamGoalInput {
	return {
		clubId: partial.teamId,
		clubEmblem: null,
		...partial
	};
}

describe('rankAttack', () => {
	it('returns empty extremes when there are no teams', () => {
		expect(rankAttack([])).toEqual({ best: [], worst: [] });
	});

	it('returns every club tied for best and worst', () => {
		const result = rankAttack([
			team({ teamId: 1, clubName: 'Alpha', goalsFor: 10, goalsAgainst: 1 }),
			team({ teamId: 2, clubName: 'Beta', goalsFor: 10, goalsAgainst: 2 }),
			team({ teamId: 3, clubName: 'Gamma', goalsFor: 2, goalsAgainst: 5 }),
			team({ teamId: 4, clubName: 'Delta', goalsFor: 2, goalsAgainst: 6 })
		]);
		expect(result.best.map((c) => c.clubName).sort()).toEqual(['Alpha', 'Beta']);
		expect(result.worst.map((c) => c.clubName).sort()).toEqual(['Delta', 'Gamma']);
		expect(result.best[0].goalCount).toBe(10);
		expect(result.worst[0].goalCount).toBe(2);
	});
});

describe('rankDefense', () => {
	it('returns empty extremes when there are no teams', () => {
		expect(rankDefense([])).toEqual({ best: [], worst: [] });
	});

	it('returns every club tied for best and worst defense', () => {
		const result = rankDefense([
			team({ teamId: 1, clubName: 'Alpha', goalsFor: 5, goalsAgainst: 1 }),
			team({ teamId: 2, clubName: 'Beta', goalsFor: 4, goalsAgainst: 1 }),
			team({ teamId: 3, clubName: 'Gamma', goalsFor: 3, goalsAgainst: 8 }),
			team({ teamId: 4, clubName: 'Delta', goalsFor: 2, goalsAgainst: 8 })
		]);
		expect(result.best.map((c) => c.clubName).sort()).toEqual(['Alpha', 'Beta']);
		expect(result.worst.map((c) => c.clubName).sort()).toEqual(['Delta', 'Gamma']);
		expect(result.best[0].goalCount).toBe(1);
		expect(result.worst[0].goalCount).toBe(8);
	});
});

describe('shuffleClubs', () => {
	it('returns a permutation of the input', () => {
		const input = [1, 2, 3, 4];
		let i = 0;
		const sequence = [0.9, 0.1, 0.5, 0.2];
		const shuffled = shuffleClubs(input, () => sequence[i++] ?? 0);
		expect([...shuffled].sort()).toEqual(input);
		expect(shuffled).not.toBe(input);
	});
});
