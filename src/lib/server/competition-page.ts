/**
 * Server helpers for the competition detail page.
 * Ports Front\CompetitionsController@show + Api\SeasonsController@getGames.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import {
	formatSeasonShort,
	parseSeasonSlug,
	seasonNameSlug
} from '#lib/competitions.ts';
import type { Match } from '#lib/components/types.ts';
import { todayInLisbon } from '#lib/format.ts';
import {
	competitionHref,
	gameHref,
	gameStatus,
	lisbonDayRangeUtc
} from '#lib/games.ts';
import { slugify } from '#lib/slug.ts';
import type {
	GroupRulesType,
	PositionZone,
	StandingsGame,
	StandingsGroup
} from '#lib/standings.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	groupRules,
	groupRulesPositions,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import {
	emblemUrl,
	goalCountsByGame,
	resolveScores
} from '#lib/server/games.ts';
import { mediaUrl } from '#lib/server/media.ts';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

export type ResolvedSeason = {
	id: number;
	competitionId: number;
	name: string | null;
	picture: string | null;
	startYear: number;
	endYear: number;
	obs: string | null;
	competitionName: string;
	competitionPicture: string | null;
};

export type CompetitionSeasonOption = {
	id: number;
	startYear: number;
	endYear: number;
	label: string;
	href: string;
	obs: string | null;
	displayName: string;
	emblem: string | null;
};

export type CompetitionPageGame = StandingsGame & {
	match: Match;
};

export type CompetitionPageRound = {
	number: number;
	games: CompetitionPageGame[];
};

export type CompetitionPageGroup = {
	id: number;
	name: string;
	nameSlug: string;
	rounds: CompetitionPageRound[];
	rules: StandingsGroup['rules'];
	/** Convenience for standings helpers. */
	standingsGroup: StandingsGroup;
};

export type CompetitionPageData = {
	seasonId: number;
	competitionId: number;
	displayName: string;
	displaySlug: string;
	emblem: string | null;
	seasonSlug: string;
	seasonLabel: string;
	startYear: number;
	endYear: number;
	obs: string | null;
	groups: CompetitionPageGroup[];
	seasons: CompetitionSeasonOption[];
	hasLiveGames: boolean;
};

function displayName(seasonName: string | null, competitionName: string): string {
	return seasonName?.trim() || competitionName;
}

function displayPicture(
	seasonPicture: string | null,
	competitionPicture: string | null
): string | null {
	return mediaUrl(seasonPicture?.trim() || competitionPicture);
}

function clubHref(clubName: string): string {
	return `/clubes/${slugify(clubName)}`;
}

function parsePositionsCsv(csv: string): number[] {
	return csv
		.split(',')
		.map((s) => Number.parseInt(s.trim(), 10))
		.filter((n) => Number.isFinite(n));
}

/**
 * Find a visible season by years + competition display slug.
 * Ports Season::findBySeasonAndCompetitionSlug.
 */
export async function findSeasonBySlugs(
	seasonSlug: string,
	competitionSlug: string
): Promise<ResolvedSeason | null> {
	const years = parseSeasonSlug(seasonSlug);
	if (!years) return null;
	const [startYear, endYear] = years;

	const rows = await db
		.select({
			id: seasons.id,
			competitionId: seasons.competitionId,
			name: seasons.name,
			picture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			obs: seasons.obs,
			competitionName: competitions.name,
			competitionPicture: competitions.picture,
			competitionVisible: competitions.visible
		})
		.from(seasons)
		.innerJoin(competitions, eq(seasons.competitionId, competitions.id))
		.where(
			and(
				eq(seasons.visible, true),
				eq(seasons.startYear, startYear),
				eq(seasons.endYear, endYear)
			)
		);

	const visible = rows.filter((r) => r.competitionVisible);

	for (const row of visible) {
		const slug = slugify(displayName(row.name, row.competitionName));
		if (slug === competitionSlug) {
			return {
				id: row.id,
				competitionId: row.competitionId,
				name: row.name,
				picture: row.picture,
				startYear: row.startYear,
				endYear: row.endYear,
				obs: row.obs,
				competitionName: row.competitionName,
				competitionPicture: row.competitionPicture
			};
		}
	}

	for (const row of visible) {
		if (slugify(row.competitionName) === competitionSlug) {
			return {
				id: row.id,
				competitionId: row.competitionId,
				name: row.name,
				picture: row.picture,
				startYear: row.startYear,
				endYear: row.endYear,
				obs: row.obs,
				competitionName: row.competitionName,
				competitionPicture: row.competitionPicture
			};
		}
	}

	return null;
}

/** Visible seasons for a competition, newest first (ports getCompetitionSeasons). */
export async function listCompetitionSeasons(
	competitionId: number
): Promise<CompetitionSeasonOption[]> {
	const rows = await db
		.select({
			id: seasons.id,
			name: seasons.name,
			picture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			obs: seasons.obs,
			competitionName: competitions.name,
			competitionPicture: competitions.picture
		})
		.from(seasons)
		.innerJoin(competitions, eq(seasons.competitionId, competitions.id))
		.where(and(eq(seasons.competitionId, competitionId), eq(seasons.visible, true)))
		.orderBy(desc(seasons.startYear), desc(seasons.id));

	return rows.map((row) => {
		const name = displayName(row.name, row.competitionName);
		return {
			id: row.id,
			startYear: row.startYear,
			endYear: row.endYear,
			label: formatSeasonShort(row.startYear, row.endYear),
			href: competitionHref({
				startYear: row.startYear,
				endYear: row.endYear,
				displayName: name
			}),
			obs: row.obs,
			displayName: name,
			emblem: displayPicture(row.picture, row.competitionPicture)
		};
	});
}

/**
 * True when any visible, non-postponed game today is in the live window
 * (started, not finished, within +3h). Drives the "results not auto-updated" banner.
 */
export async function hasLiveGameNow(now = new Date()): Promise<boolean> {
	const today = todayInLisbon();
	const { startNaive, endNaive } = lisbonDayRangeUtc(today);

	const rows = await db
		.select({
			date: games.date,
			finished: games.finished,
			postponed: games.postponed
		})
		.from(games)
		.where(
			and(
				eq(games.visible, true),
				sql`${games.date} >= ${startNaive}`,
				sql`${games.date} < ${endNaive}`
			)
		);

	for (const row of rows) {
		if (row.postponed) continue;
		const kickoff = naiveToIso(row.date);
		const status = gameStatus(
			{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
			now
		);
		if (status === 'live') return true;
	}
	return false;
}

type GameRow = {
	id: number | null;
	round: number | null;
	date: string | Date | null;
	goalsHome: number | null;
	goalsAway: number | null;
	penaltiesHome: number | null;
	penaltiesAway: number | null;
	finished: boolean | null;
	postponed: boolean | null;
	homeTeamId: number | null;
	awayTeamId: number | null;
	groupId: number;
	groupName: string | null;
	groupRulesId: number;
	rulesName: string;
	rulesType: GroupRulesType;
	promotes: number;
	relegates: number;
	tieBreakerScript: string | null;
	homeClubName: string | null;
	homeClubEmblem: string | null;
	awayClubName: string | null;
	awayClubEmblem: string | null;
};

/** Load all groups + rounds + games for a season (no games.visible filter). */
export async function getSeasonGroups(
	season: ResolvedSeason,
	now = new Date()
): Promise<CompetitionPageGroup[]> {
	const display = displayName(season.name, season.competitionName);

	const gameRows: GameRow[] = await db
		.select({
			id: games.id,
			round: games.round,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			finished: games.finished,
			postponed: games.postponed,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			groupId: gameGroups.id,
			groupName: gameGroups.name,
			groupRulesId: gameGroups.groupRulesId,
			rulesName: groupRules.name,
			rulesType: groupRules.type,
			promotes: groupRules.promotes,
			relegates: groupRules.relegates,
			tieBreakerScript: groupRules.tieBreakerScript,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem
		})
		.from(gameGroups)
		.innerJoin(groupRules, eq(gameGroups.groupRulesId, groupRules.id))
		.leftJoin(games, eq(games.gameGroupId, gameGroups.id))
		.leftJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.leftJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.leftJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.leftJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(eq(gameGroups.seasonId, season.id))
		.orderBy(asc(gameGroups.id), asc(games.id));

	// Also load empty groups (no games) — the left join above covers them.
	const positionRows = await db
		.select({
			groupRulesId: groupRulesPositions.groupRulesId,
			positions: groupRulesPositions.positions,
			color: groupRulesPositions.color,
			label: groupRulesPositions.label
		})
		.from(groupRulesPositions)
		.innerJoin(groupRules, eq(groupRulesPositions.groupRulesId, groupRules.id))
		.innerJoin(gameGroups, eq(gameGroups.groupRulesId, groupRules.id))
		.where(eq(gameGroups.seasonId, season.id));

	const positionsByRules = new Map<number, PositionZone[]>();
	for (const row of positionRows) {
		let list = positionsByRules.get(row.groupRulesId);
		if (!list) {
			list = [];
			positionsByRules.set(row.groupRulesId, list);
		}
		list.push({
			positions: parsePositionsCsv(row.positions),
			color: row.color,
			label: row.label
		});
	}

	const needCounts = gameRows
		.filter((r) => r.id != null && (r.goalsHome == null || r.goalsAway == null))
		.map((r) => r.id as number);
	const counts = await goalCountsByGame(needCounts);

	type Bucket = {
		id: number;
		name: string;
		nameSlug: string;
		rules: StandingsGroup['rules'];
		rounds: Map<number, CompetitionPageGame[]>;
	};

	const buckets = new Map<number, Bucket>();

	for (const row of gameRows) {
		let bucket = buckets.get(row.groupId);
		if (!bucket) {
			const groupName = row.groupName?.trim() || display;
			bucket = {
				id: row.groupId,
				name: groupName,
				nameSlug: slugify(groupName),
				rules: {
					type: row.rulesType,
					rulesName: row.rulesName,
					promotes: row.promotes,
					relegates: row.relegates,
					tieBreakerScript: row.tieBreakerScript,
					positions: positionsByRules.get(row.groupRulesId) ?? []
				},
				rounds: new Map()
			};
			buckets.set(row.groupId, bucket);
		}

		// Empty group (left join yielded null game)
		if (
			row.id == null ||
			row.round == null ||
			row.date == null ||
			row.homeClubName == null ||
			row.awayClubName == null ||
			row.homeTeamId == null ||
			row.awayTeamId == null
		) {
			continue;
		}

		const scoreRow = {
			id: row.id,
			goalsHome: row.goalsHome,
			goalsAway: row.goalsAway,
			homeTeamId: row.homeTeamId,
			awayTeamId: row.awayTeamId
		};
		const { homeScore, awayScore } = resolveScores(scoreRow, counts);
		const kickoff = naiveToIso(row.date);
		const finished = Boolean(row.finished);
		const postponed = Boolean(row.postponed);
		const status = gameStatus({ kickoffIso: kickoff, finished, postponed }, now);
		const showScore = status === 'live' || status === 'finished';
		const decidedByPenalties =
			showScore &&
			homeScore === awayScore &&
			row.penaltiesHome != null &&
			row.penaltiesAway != null;

		const match: Match = {
			id: row.id,
			href: gameHref({
				startYear: season.startYear,
				endYear: season.endYear,
				displayName: display,
				groupName: bucket.name,
				round: row.round,
				homeClubName: row.homeClubName,
				awayClubName: row.awayClubName
			}),
			status,
			kickoff,
			home: { name: row.homeClubName, emblem: emblemUrl(row.homeClubEmblem) },
			away: { name: row.awayClubName, emblem: emblemUrl(row.awayClubEmblem) },
			homeScore: showScore ? homeScore : null,
			awayScore: showScore ? awayScore : null,
			penalties: decidedByPenalties
				? { home: row.penaltiesHome!, away: row.penaltiesAway! }
				: null
		};

		const standingsGame: CompetitionPageGame = {
			finished,
			homeClubName: row.homeClubName,
			awayClubName: row.awayClubName,
			homeClubEmblem: emblemUrl(row.homeClubEmblem),
			awayClubEmblem: emblemUrl(row.awayClubEmblem),
			homeClubUrl: clubHref(row.homeClubName),
			awayClubUrl: clubHref(row.awayClubName),
			homeScore,
			awayScore,
			match
		};

		let roundGames = bucket.rounds.get(row.round);
		if (!roundGames) {
			roundGames = [];
			bucket.rounds.set(row.round, roundGames);
		}
		roundGames.push(standingsGame);
	}

	// Preserve game_groups id order
	return [...buckets.values()].map((bucket) => {
		const rounds: CompetitionPageRound[] = [...bucket.rounds.entries()]
			.sort(([a], [b]) => a - b)
			.map(([number, games]) => ({ number, games }));

		const standingsGroup: StandingsGroup = {
			name: bucket.name,
			rounds: rounds.map((r) => ({
				number: r.number,
				games: r.games.map(({ match: _m, ...g }) => g)
			})),
			rules: bucket.rules
		};

		return {
			id: bucket.id,
			name: bucket.name,
			nameSlug: bucket.nameSlug,
			rounds,
			rules: bucket.rules,
			standingsGroup
		};
	});
}

/** Full page payload for the competition detail route. */
export async function loadCompetitionPage(
	season: ResolvedSeason
): Promise<CompetitionPageData> {
	const name = displayName(season.name, season.competitionName);
	const slug = slugify(name);
	const seasonSlug = seasonNameSlug(season.startYear, season.endYear);

	const [groups, seasonOptions, live] = await Promise.all([
		getSeasonGroups(season),
		listCompetitionSeasons(season.competitionId),
		hasLiveGameNow()
	]);

	return {
		seasonId: season.id,
		competitionId: season.competitionId,
		displayName: name,
		displaySlug: slug,
		emblem: displayPicture(season.picture, season.competitionPicture),
		seasonSlug,
		seasonLabel: formatSeasonShort(season.startYear, season.endYear),
		startYear: season.startYear,
		endYear: season.endYear,
		obs: season.obs,
		groups,
		seasons: seasonOptions,
		hasLiveGames: live
	};
}
