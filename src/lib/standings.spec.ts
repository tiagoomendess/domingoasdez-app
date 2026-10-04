import { describe, expect, it } from 'vitest';
import {
	applyAfpbTieBreaker,
	buildStandings,
	defaultRound,
	roundLabelKey,
	tieBreakerFor,
	zonesFor,
	type StandingRow,
	type StandingsGame,
	type StandingsGroup
} from './standings.ts';

function game(
	partial: Partial<StandingsGame> &
		Pick<StandingsGame, 'homeClubName' | 'awayClubName' | 'homeScore' | 'awayScore' | 'finished'>
): StandingsGame {
	return {
		homeClubEmblem: null,
		awayClubEmblem: null,
		homeClubUrl: `/clubes/${partial.homeClubName}`,
		awayClubUrl: `/clubes/${partial.awayClubName}`,
		...partial
	};
}

function pointsGroup(
	rounds: StandingsGroup['rounds'],
	rules: Partial<StandingsGroup['rules']> = {}
): StandingsGroup {
	return {
		name: 'Série A',
		rounds,
		rules: {
			type: 'points',
			rulesName: 'Default Points',
			promotes: 0,
			relegates: 0,
			tieBreakerScript: null,
			positions: [],
			...rules
		}
	};
}

function names(table: StandingRow[]): string[] {
	return table.map((r) => r.clubName);
}

describe('roundLabelKey', () => {
	it('maps group rules types to message keys', () => {
		expect(roundLabelKey('points')).toBe('round_matchday');
		expect(roundLabelKey('elimination')).toBe('round_cup_tie');
		expect(roundLabelKey('friendly')).toBe('round_friendlies');
		expect(roundLabelKey('other')).toBe('round_week');
	});
});

describe('defaultRound', () => {
	it('returns the highest round with a finished game', () => {
		const group = pointsGroup([
			{
				number: 1,
				games: [game({ homeClubName: 'A', awayClubName: 'B', homeScore: 1, awayScore: 0, finished: true })]
			},
			{
				number: 2,
				games: [game({ homeClubName: 'A', awayClubName: 'C', homeScore: 0, awayScore: 0, finished: true })]
			},
			{
				number: 3,
				games: [game({ homeClubName: 'B', awayClubName: 'C', homeScore: 0, awayScore: 0, finished: false })]
			}
		]);
		expect(defaultRound(group)).toBe(2);
	});

	it('falls back to the first round when nothing is finished', () => {
		const group = pointsGroup([
			{
				number: 5,
				games: [game({ homeClubName: 'A', awayClubName: 'B', homeScore: 0, awayScore: 0, finished: false })]
			},
			{
				number: 6,
				games: [game({ homeClubName: 'A', awayClubName: 'C', homeScore: 0, awayScore: 0, finished: false })]
			}
		]);
		expect(defaultRound(group)).toBe(5);
	});

	it('returns null for empty groups', () => {
		expect(defaultRound(pointsGroup([]))).toBeNull();
	});
});

describe('buildStandings', () => {
	it('awards 3/1/0 and only counts finished games', () => {
		const group = pointsGroup([
			{
				number: 1,
				games: [
					game({ homeClubName: 'Alpha', awayClubName: 'Beta', homeScore: 2, awayScore: 1, finished: true }),
					game({ homeClubName: 'Gamma', awayClubName: 'Delta', homeScore: 0, awayScore: 0, finished: true })
				]
			},
			{
				number: 2,
				games: [
					game({ homeClubName: 'Alpha', awayClubName: 'Gamma', homeScore: 3, awayScore: 0, finished: false })
				]
			}
		]);

		const table = buildStandings(group, 2);
		expect(names(table)).toEqual(['Alpha', 'Gamma', 'Delta', 'Beta']);
		expect(table[0]).toMatchObject({ played: 1, wins: 1, points: 3, gf: 2, ga: 1 });
		expect(table[1]).toMatchObject({ played: 1, draws: 1, points: 1, gf: 0, ga: 0 });
		expect(table[2]).toMatchObject({ played: 1, draws: 1, points: 1, gf: 0, ga: 0 });
		expect(table[3]).toMatchObject({ played: 1, losses: 1, points: 0, gf: 1, ga: 2 });
	});

	it('cuts off after the selected round', () => {
		const group = pointsGroup([
			{
				number: 1,
				games: [game({ homeClubName: 'A', awayClubName: 'B', homeScore: 1, awayScore: 0, finished: true })]
			},
			{
				number: 2,
				games: [game({ homeClubName: 'B', awayClubName: 'A', homeScore: 5, awayScore: 0, finished: true })]
			},
			{
				number: 3,
				games: [game({ homeClubName: 'B', awayClubName: 'A', homeScore: 2, awayScore: 0, finished: true })]
			}
		]);

		const asOf1 = buildStandings(group, 1);
		expect(asOf1[0].clubName).toBe('A');
		expect(asOf1[0].points).toBe(3);
		expect(asOf1[0].played).toBe(1);

		const asOf2 = buildStandings(group, 2);
		// A 3pts (W+L), B 3pts (L+W) — tied; played still 2 each
		expect(asOf2.every((r) => r.played === 2)).toBe(true);
		expect(asOf2.find((r) => r.clubName === 'A')?.gf).toBe(1);
		expect(asOf2.find((r) => r.clubName === 'B')?.gf).toBe(5);

		const asOf3 = buildStandings(group, 3);
		expect(asOf3[0].clubName).toBe('B');
		expect(asOf3[0].points).toBe(6);
		expect(asOf3[1].points).toBe(3);
	});

	it('keys clubs by name and keeps first-seen emblems', () => {
		const group = pointsGroup([
			{
				number: 1,
				games: [
					game({
						homeClubName: 'Sporting',
						awayClubName: 'Braga',
						homeScore: 1,
						awayScore: 1,
						finished: true,
						homeClubEmblem: '/sporting.png',
						awayClubEmblem: '/braga.png'
					})
				]
			}
		]);
		const table = buildStandings(group, 1);
		expect(table.find((r) => r.clubName === 'Sporting')?.clubEmblem).toBe('/sporting.png');
		expect(table.find((r) => r.clubName === 'Braga')?.clubEmblem).toBe('/braga.png');
	});
});

describe('tieBreakerFor', () => {
	it('uses AFPB for known rules names', () => {
		expect(
			tieBreakerFor({
				type: 'points',
				rulesName: 'afpb_pontos_2018_div1',
				promotes: 0,
				relegates: 0,
				tieBreakerScript: null,
				positions: []
			})
		).toBe('afpb');
	});

	it('maps the known DB script to AFPB', () => {
		expect(
			tieBreakerFor({
				type: 'points',
				rulesName: 'afpb_pontos_div2_a_2025_26',
				promotes: 0,
				relegates: 0,
				tieBreakerScript: 'return afpb_points_2018(table, group, round);',
				positions: []
			})
		).toBe('afpb');
	});

	it('falls back to points for Default Points', () => {
		expect(
			tieBreakerFor({
				type: 'points',
				rulesName: 'Default Points',
				promotes: 0,
				relegates: 0,
				tieBreakerScript: null,
				positions: []
			})
		).toBe('points');
	});
});

describe('AFPB tie-breaker', () => {
	it('ranks by head-to-head points among equal-point clubs', () => {
		// Both on 3 pts: A beat B, so A above B. C finished below.
		const group = pointsGroup(
			[
				{
					number: 1,
					games: [
						game({ homeClubName: 'A', awayClubName: 'B', homeScore: 2, awayScore: 0, finished: true }),
						game({ homeClubName: 'C', awayClubName: 'D', homeScore: 1, awayScore: 0, finished: true })
					]
				},
				{
					number: 2,
					games: [
						game({ homeClubName: 'B', awayClubName: 'C', homeScore: 1, awayScore: 0, finished: true }),
						game({ homeClubName: 'A', awayClubName: 'D', homeScore: 0, awayScore: 1, finished: true })
					]
				}
			],
			{ rulesName: 'afpb_pontos_2018_div1' }
		);

		// A: win + loss = 3pts; B: loss + win = 3pts; C: win + loss = 3pts; D: loss + win = 3pts
		// H2H A vs B: A wins → A above B
		const table = buildStandings(group, 2);
		const aIdx = table.findIndex((r) => r.clubName === 'A');
		const bIdx = table.findIndex((r) => r.clubName === 'B');
		expect(aIdx).toBeLessThan(bIdx);
	});

	it('uses unfinished games in head-to-head (legacy quirk)', () => {
		const group = pointsGroup(
			[
				{
					number: 1,
					games: [
						game({ homeClubName: 'A', awayClubName: 'B', homeScore: 1, awayScore: 0, finished: true }),
						game({ homeClubName: 'C', awayClubName: 'D', homeScore: 1, awayScore: 0, finished: true })
					]
				},
				{
					number: 2,
					games: [
						// Unfinished but has a score — legacy H2H still counts it
						game({ homeClubName: 'B', awayClubName: 'A', homeScore: 5, awayScore: 0, finished: false })
					]
				}
			],
			{ rulesName: 'afpb_pontos_basico' }
		);

		// Both A and B have 3 pts from round 1. H2H: A beat B (3), B "beat" A unfinished (3) → tied H2H points.
		// Then H2H GD: A +1 from finished, B +5 from unfinished → B ahead.
		const table = buildStandings(group, 2);
		expect(table.find((r) => r.clubName === 'A')?.points).toBe(3);
		expect(table.find((r) => r.clubName === 'B')?.points).toBe(0);
		// Points differ so AFPB pairwise only runs within equal-points blocks.
		// Force equal points with a synthetic table:
		const equal: StandingRow[] = [
			{
				clubName: 'A',
				clubEmblem: null,
				clubUrl: '/a',
				played: 1,
				wins: 1,
				draws: 0,
				losses: 0,
				gf: 1,
				ga: 0,
				points: 3
			},
			{
				clubName: 'B',
				clubEmblem: null,
				clubUrl: '/b',
				played: 1,
				wins: 1,
				draws: 0,
				losses: 0,
				gf: 1,
				ga: 0,
				points: 3
			}
		];
		const sorted = applyAfpbTieBreaker(equal, group, 2);
		expect(sorted[0].clubName).toBe('B');
	});

	it('falls back to alphabetical order when all other criteria tie', () => {
		const group = pointsGroup(
			[
				{
					number: 1,
					games: [
						game({ homeClubName: 'Zebra', awayClubName: 'Alpha', homeScore: 0, awayScore: 0, finished: true })
					]
				}
			],
			{ rulesName: 'afpb_pontos_2018_div1' }
		);
		const table = buildStandings(group, 1);
		expect(names(table)).toEqual(['Alpha', 'Zebra']);
	});
});

describe('zonesFor', () => {
	const rows = (n: number): StandingRow[] =>
		Array.from({ length: n }, (_, i) => ({
			clubName: `Club ${i + 1}`,
			clubEmblem: null,
			clubUrl: `/c${i}`,
			played: 0,
			wins: 0,
			draws: 0,
			losses: 0,
			gf: 0,
			ga: 0,
			points: 0
		}));

	it('applies legacy champion / promotion / relegation zones', () => {
		const group = pointsGroup([], { promotes: 3, relegates: 2 });
		const { rows: zones, legend } = zonesFor(group, rows(8));

		expect(zones[0].kind).toBe('champion');
		expect(zones[1].kind).toBe('promotion');
		expect(zones[2].kind).toBe('promotion');
		expect(zones[3].kind).toBeNull();
		expect(zones[6].kind).toBe('relegation');
		expect(zones[7].kind).toBe('relegation');

		expect(legend.map((l) => l.label)).toEqual(['promotion', 'relegation']);
	});

	it('shows champion in the legend when promotes is 0', () => {
		const group = pointsGroup([], { promotes: 0, relegates: 1 });
		const { legend } = zonesFor(group, rows(4));
		expect(legend.map((l) => l.label)).toEqual(['champion', 'relegation']);
	});

	it('uses group_rules_positions when present', () => {
		const group = pointsGroup([], {
			positions: [
				{ positions: [1, 2], color: '#99d98b', label: 'Apuramento' },
				{ positions: [8, 9], color: '#f3a4a4', label: 'Despromoção' }
			]
		});
		const { rows: zones, legend } = zonesFor(group, rows(9));
		expect(zones[0]).toMatchObject({ kind: 'custom', color: '#99d98b', label: 'Apuramento' });
		expect(zones[7]).toMatchObject({ kind: 'custom', color: '#f3a4a4', label: 'Despromoção' });
		expect(zones[2].kind).toBeNull();
		expect(legend).toHaveLength(2);
		expect(legend[0].label).toBe('Apuramento');
	});
});
