/**
 * Pure standings / round helpers ported from legacy competition-scripts.js
 * and points-tie-breakers-scripts.js. Used client-side so changing round
 * recomputes the table without a network request.
 */

export type GroupRulesType = 'points' | 'elimination' | 'friendly' | 'other';

export type PositionZone = {
	/** 1-based positions this zone covers. */
	positions: number[];
	color: string;
	label: string;
};

export type StandingsGame = {
	finished: boolean;
	homeClubName: string;
	awayClubName: string;
	homeClubEmblem: string | null;
	awayClubEmblem: string | null;
	homeClubUrl: string;
	awayClubUrl: string;
	homeScore: number;
	awayScore: number;
};

export type StandingsRound = {
	number: number;
	games: StandingsGame[];
};

export type StandingsGroupRules = {
	type: GroupRulesType;
	rulesName: string;
	promotes: number;
	relegates: number;
	tieBreakerScript: string | null;
	positions: PositionZone[];
};

export type StandingsGroup = {
	name: string;
	rounds: StandingsRound[];
	rules: StandingsGroupRules;
};

export type StandingRow = {
	clubName: string;
	clubEmblem: string | null;
	clubUrl: string;
	played: number;
	wins: number;
	draws: number;
	losses: number;
	gf: number;
	ga: number;
	points: number;
};

export type ZoneKind = 'champion' | 'promotion' | 'relegation' | 'custom' | null;

export type RowZone = {
	kind: ZoneKind;
	color: string | null;
	label: string | null;
};

export type LegendItem = {
	color: string;
	label: string;
};

/** Legacy AFPB rules_name values that use the AFPB head-to-head tie-breaker. */
const AFPB_RULES_NAMES = new Set([
	'afpb_pontos_2018_div1',
	'afpb_pontos_2018_div2',
	'afpb_pontos_basico',
	'afpb_pontos_2019_div1',
	'afpb_series_2021',
	'afpb_pontos_2023_div1',
	'afpb_pontos_series_2023_div2'
]);

/** Known DB scripts that call the AFPB tie-breaker (never eval DB JS). */
const AFPB_SCRIPT_SNIPPETS = [
	'afpb_points_2018(table, group, round)',
	'afpb_points_2018(table,group,round)'
];

export type RoundLabelKey =
	| 'round_matchday'
	| 'round_cup_tie'
	| 'round_friendlies'
	| 'round_week';

export function roundLabelKey(type: GroupRulesType): RoundLabelKey {
	switch (type) {
		case 'points':
			return 'round_matchday';
		case 'elimination':
			return 'round_cup_tie';
		case 'friendly':
			return 'round_friendlies';
		default:
			return 'round_week';
	}
}

/**
 * Highest round that has at least one finished game; otherwise the first round.
 * Matches handleGetGamesRequest in competition-scripts.js.
 */
export function defaultRound(group: Pick<StandingsGroup, 'rounds'>): number | null {
	const rounds = [...group.rounds].sort((a, b) => a.number - b.number);
	if (rounds.length === 0) return null;

	let chosen: number | undefined;
	for (const round of rounds) {
		for (const game of round.games) {
			if (game.finished) chosen = round.number;
		}
	}
	return chosen ?? rounds[0].number;
}

export type TieBreaker = 'afpb' | 'points';

/**
 * Resolve which tie-breaker to apply. Custom DB scripts are mapped to AFPB when
 * they call afpb_points_2018; unknown scripts fall back to the rules_name switch.
 */
export function tieBreakerFor(rules: StandingsGroupRules): TieBreaker {
	const script = rules.tieBreakerScript?.trim();
	if (script) {
		const normalized = script.replace(/\s+/g, '');
		if (AFPB_SCRIPT_SNIPPETS.some((s) => normalized.includes(s.replace(/\s+/g, '')))) {
			return 'afpb';
		}
		console.warn(
			`Unrecognized tie_breaker_script for rules "${rules.rulesName}", falling back to rules_name`
		);
	}

	if (AFPB_RULES_NAMES.has(rules.rulesName)) return 'afpb';
	return 'points';
}

function emptyRow(
	clubName: string,
	clubEmblem: string | null,
	clubUrl: string
): StandingRow {
	return {
		clubName,
		clubEmblem,
		clubUrl,
		played: 0,
		wins: 0,
		draws: 0,
		losses: 0,
		gf: 0,
		ga: 0,
		points: 0
	};
}

function ensureRow(
	table: StandingRow[],
	clubName: string,
	clubEmblem: string | null,
	clubUrl: string
): StandingRow {
	const existing = table.find((r) => r.clubName === clubName);
	if (existing) return existing;
	const row = emptyRow(clubName, clubEmblem, clubUrl);
	table.push(row);
	return row;
}

function applyResult(row: StandingRow, gf: number, ga: number) {
	row.played++;
	row.gf += gf;
	row.ga += ga;
	if (gf > ga) {
		row.wins++;
		row.points += 3;
	} else if (gf === ga) {
		row.draws++;
		row.points += 1;
	} else {
		row.losses++;
	}
}

/**
 * Build the standings table as of `round` (inclusive), matching buildPointsTable.
 * Clubs are keyed by club name; first-seen order is home then away within each game.
 */
export function buildStandings(group: StandingsGroup, round: number): StandingRow[] {
	const rounds = [...group.rounds].sort((a, b) => a.number - b.number);
	const table: StandingRow[] = [];

	for (const r of rounds) {
		for (const game of r.games) {
			ensureRow(table, game.homeClubName, game.homeClubEmblem, game.homeClubUrl);
			ensureRow(table, game.awayClubName, game.awayClubEmblem, game.awayClubUrl);

			if (game.finished) {
				const home = table.find((row) => row.clubName === game.homeClubName)!;
				const away = table.find((row) => row.clubName === game.awayClubName)!;
				applyResult(home, game.homeScore, game.awayScore);
				applyResult(away, game.awayScore, game.homeScore);
			}
		}
		if (r.number >= round) break;
	}

	// Stable sort by points descending (legacy Array.sort is stable in modern engines).
	table.sort((a, b) => b.points - a.points);

	if (tieBreakerFor(group.rules) === 'afpb') {
		return applyAfpbTieBreaker(table, group, round);
	}
	return table;
}

function gamesUpToRound(group: StandingsGroup, maxRound: number): StandingsGame[] {
	const rounds = [...group.rounds].sort((a, b) => a.number - b.number);
	const games: StandingsGame[] = [];
	for (const r of rounds) {
		if (r.number > maxRound) break;
		games.push(...r.games);
	}
	return games;
}

/**
 * Head-to-head point difference for club1 vs club2 through maxRound.
 * Legacy quirk: does NOT check `finished`.
 */
function h2hPointDiff(
	games: StandingsGame[],
	club1: string,
	club2: string
): number {
	let p1 = 0;
	let p2 = 0;

	for (const game of games) {
		const homeIs1 = game.homeClubName === club1 && game.awayClubName === club2;
		const awayIs1 = game.awayClubName === club1 && game.homeClubName === club2;
		if (!homeIs1 && !awayIs1) continue;

		if (game.homeScore > game.awayScore) {
			if (homeIs1) p1 += 3;
			else p2 += 3;
		} else if (game.homeScore < game.awayScore) {
			if (homeIs1) p2 += 3;
			else p1 += 3;
		} else {
			p1 += 1;
			p2 += 1;
		}
	}

	return p1 - p2;
}

/**
 * Head-to-head goal-difference for club1 vs club2 through maxRound.
 * Legacy quirk: does NOT check `finished`.
 */
function h2hGoalDiff(games: StandingsGame[], club1: string, club2: string): number {
	let gd1 = 0;
	let gd2 = 0;

	for (const game of games) {
		if (game.homeClubName === club1 && game.awayClubName === club2) {
			gd1 += game.homeScore - game.awayScore;
			gd2 += game.awayScore - game.homeScore;
		} else if (game.awayClubName === club1 && game.homeClubName === club2) {
			gd2 += game.homeScore - game.awayScore;
			gd1 += game.awayScore - game.homeScore;
		}
	}

	return gd1 - gd2;
}

function swap(table: StandingRow[], i: number, j: number) {
	const tmp = table[i];
	table[i] = table[j];
	table[j] = tmp;
}

/**
 * Pairwise AFPB tie-breaker (afpb_points_2018). Mutates and returns `table`.
 */
export function applyAfpbTieBreaker(
	table: StandingRow[],
	group: StandingsGroup,
	round: number
): StandingRow[] {
	const games = gamesUpToRound(group, round);

	for (let i = 0; i < table.length; i++) {
		if (i + 1 >= table.length) break;

		for (let j = i + 1; j < table.length; j++) {
			if (table[i].points > table[j].points) break;
			if (table[i].points !== table[j].points) continue;

			const pointDiff = h2hPointDiff(games, table[i].clubName, table[j].clubName);
			if (pointDiff < 0) {
				swap(table, i, j);
				continue;
			}
			if (pointDiff !== 0) continue;

			const goalDiff = h2hGoalDiff(games, table[i].clubName, table[j].clubName);
			if (goalDiff < 0) {
				swap(table, i, j);
				continue;
			}
			if (goalDiff !== 0) continue;

			const gdI = table[i].gf - table[i].ga;
			const gdJ = table[j].gf - table[j].ga;
			if (gdI < gdJ) {
				swap(table, i, j);
				continue;
			}
			if (gdI !== gdJ) continue;

			if (table[i].wins < table[j].wins) {
				swap(table, i, j);
				continue;
			}
			if (table[i].wins !== table[j].wins) continue;

			if (table[i].gf < table[j].gf) {
				swap(table, i, j);
				continue;
			}
			if (table[i].gf !== table[j].gf) continue;

			if (table[i].ga > table[j].ga) {
				swap(table, i, j);
				continue;
			}
			if (table[i].ga !== table[j].ga) continue;

			if (
				table[i].clubName.localeCompare(table[j].clubName, undefined, {
					sensitivity: 'base',
					numeric: true,
					ignorePunctuation: false
				}) > 0
			) {
				swap(table, i, j);
			}
		}
	}

	return table;
}

/** Semantic colours for legacy promote/relegate zones (readable in both themes). */
export const LEGACY_ZONE_COLORS = {
	champion: 'var(--color-success)',
	promotion: 'var(--color-success)',
	relegation: 'var(--color-danger)'
} as const;

/**
 * Zone metadata for each standings row (0-based index in the sorted table).
 * Prefer `group_rules_positions` when present; otherwise legacy promotes/relegates.
 */
export function zonesFor(
	group: StandingsGroup,
	table: StandingRow[]
): { rows: RowZone[]; legend: LegendItem[] } {
	const positions = group.rules.positions;
	if (positions.length > 0) {
		const rows: RowZone[] = table.map((_, index) => {
			const position = index + 1;
			for (const zone of positions) {
				if (zone.positions.includes(position)) {
					return { kind: 'custom', color: zone.color, label: zone.label };
				}
			}
			return { kind: null, color: null, label: null };
		});
		return {
			rows,
			legend: positions.map((z) => ({ color: z.color, label: z.label }))
		};
	}

	const { promotes, relegates } = group.rules;
	const rows: RowZone[] = table.map((_, k) => {
		if (k === 0) {
			return { kind: 'champion', color: LEGACY_ZONE_COLORS.champion, label: null };
		}
		if (k > 0 && k < promotes) {
			return { kind: 'promotion', color: LEGACY_ZONE_COLORS.promotion, label: null };
		}
		if (k > 0 && k >= table.length - relegates) {
			return { kind: 'relegation', color: LEGACY_ZONE_COLORS.relegation, label: null };
		}
		return { kind: null, color: null, label: null };
	});

	const legend: LegendItem[] = [];
	if (promotes > 0) {
		legend.push({ color: LEGACY_ZONE_COLORS.promotion, label: 'promotion' });
	}
	if (promotes === 0) {
		legend.push({ color: LEGACY_ZONE_COLORS.champion, label: 'champion' });
	}
	if (relegates > 0) {
		legend.push({ color: LEGACY_ZONE_COLORS.relegation, label: 'relegation' });
	}

	return { rows, legend };
}
