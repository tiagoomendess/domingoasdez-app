import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { formatSeasonLabel } from '#lib/competitions.ts';
import type { Match } from '#lib/components/types.ts';
import { todayInLisbon } from '#lib/format.ts';
import {
	competitionHref,
	gameHref,
	gameStatus,
	isLiveStatus,
	lisbonDayOf,
	lisbonDayRangeUtc
} from '#lib/games.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	goals,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';

const DEFAULT_EMBLEM = '/images/default-emblem.png';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

export type MatchGroupView = {
	id: number;
	name: string;
	subtitle: string;
	emblem: string | null;
	href: string;
	matches: Match[];
};

export type DayGames = {
	live: MatchGroupView[];
	groups: MatchGroupView[];
};

export type DayMarkers = Record<string, 'games' | 'live'>;

export function emblemUrl(path: string | null | undefined): string | null {
	return mediaUrl(path?.trim() || DEFAULT_EMBLEM);
}

function seasonDisplayName(seasonName: string | null, competitionName: string): string {
	const trimmed = seasonName?.trim();
	return trimmed || competitionName;
}

function seasonPicture(
	seasonPicturePath: string | null,
	competitionPicture: string | null
): string | null {
	const trimmed = seasonPicturePath?.trim();
	return trimmed || competitionPicture;
}

type GameRow = {
	id: number;
	round: number;
	date: string | Date;
	goalsHome: number | null;
	goalsAway: number | null;
	penaltiesHome: number | null;
	penaltiesAway: number | null;
	finished: boolean;
	postponed: boolean;
	homeTeamId: number;
	awayTeamId: number;
	groupId: number;
	groupName: string | null;
	seasonId: number;
	seasonName: string | null;
	seasonPicture: string | null;
	startYear: number;
	endYear: number;
	competitionId: number;
	competitionName: string;
	competitionPicture: string | null;
	competitionPriority: number;
	homeClubName: string;
	homeClubEmblem: string | null;
	awayClubName: string;
	awayClubEmblem: string | null;
};

async function loadGamesInRange(startNaive: string, endNaive: string): Promise<GameRow[]> {
	return db
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
			seasonId: seasons.id,
			seasonName: seasons.name,
			seasonPicture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			competitionId: competitions.id,
			competitionName: competitions.name,
			competitionPicture: competitions.picture,
			competitionPriority: competitions.priority,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem
		})
		.from(games)
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(seasons, eq(gameGroups.seasonId, seasons.id))
		.innerJoin(competitions, eq(seasons.competitionId, competitions.id))
		.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(
			and(
				eq(games.visible, true),
				sql`${games.date} >= ${startNaive}`,
				sql`${games.date} < ${endNaive}`
			)
		)
		.orderBy(asc(games.date), asc(games.id));
}

export async function goalCountsByGame(
	gameIds: number[]
): Promise<Map<number, Map<number, number>>> {
	const result = new Map<number, Map<number, number>>();
	if (gameIds.length === 0) return result;

	const rows = await db
		.select({
			gameId: goals.gameId,
			teamId: goals.teamId,
			count: sql<number>`count(*)`.mapWith(Number)
		})
		.from(goals)
		.where(inArray(goals.gameId, gameIds))
		.groupBy(goals.gameId, goals.teamId);

	for (const row of rows) {
		let byTeam = result.get(row.gameId);
		if (!byTeam) {
			byTeam = new Map();
			result.set(row.gameId, byTeam);
		}
		byTeam.set(row.teamId, row.count);
	}

	return result;
}

export function resolveScores(
	row: { id: number; goalsHome: number | null; goalsAway: number | null; homeTeamId: number; awayTeamId: number },
	counts: Map<number, Map<number, number>>
): { homeScore: number; awayScore: number } {
	const byTeam = counts.get(row.id);
	return {
		homeScore: row.goalsHome ?? byTeam?.get(row.homeTeamId) ?? 0,
		awayScore: row.goalsAway ?? byTeam?.get(row.awayTeamId) ?? 0
	};
}

function toMatch(row: GameRow, counts: Map<number, Map<number, number>>, now: Date): Match {
	const kickoff = naiveToIso(row.date);
	const status = gameStatus(
		{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
		now
	);
	const { homeScore, awayScore } = resolveScores(row, counts);
	const displayName = seasonDisplayName(row.seasonName, row.competitionName);
	const groupName = row.groupName?.trim() || displayName;

	const showScore = status === 'live' || status === 'finished';
	const decidedByPenalties =
		showScore &&
		homeScore != null &&
		awayScore != null &&
		homeScore === awayScore &&
		row.penaltiesHome != null &&
		row.penaltiesAway != null;

	return {
		id: row.id,
		href: gameHref({
			startYear: row.startYear,
			endYear: row.endYear,
			displayName,
			groupName,
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
}

function groupRows(
	rows: GameRow[],
	counts: Map<number, Map<number, number>>,
	now: Date
): MatchGroupView[] {
	type Bucket = {
		id: number;
		name: string;
		subtitle: string;
		emblem: string | null;
		href: string;
		priority: number;
		competitionId: number;
		earliestKickoff: number;
		matches: Match[];
	};

	const buckets = new Map<number, Bucket>();

	for (const row of rows) {
		const match = toMatch(row, counts, now);
		const displayName = seasonDisplayName(row.seasonName, row.competitionName);
		const groupName = row.groupName?.trim() || displayName;
		const picture = seasonPicture(row.seasonPicture, row.competitionPicture);
		const kickoffMs = new Date(match.kickoff).getTime();

		let bucket = buckets.get(row.groupId);
		if (!bucket) {
			bucket = {
				id: row.groupId,
				name: displayName,
				subtitle: `${groupName} · ${formatSeasonLabel(row.startYear, row.endYear)}`,
				emblem: emblemUrl(picture),
				href: competitionHref({
					startYear: row.startYear,
					endYear: row.endYear,
					displayName
				}),
				priority: row.competitionPriority,
				competitionId: row.competitionId,
				earliestKickoff: kickoffMs,
				matches: []
			};
			buckets.set(row.groupId, bucket);
		} else {
			bucket.earliestKickoff = Math.min(bucket.earliestKickoff, kickoffMs);
		}
		bucket.matches.push(match);
	}

	return [...buckets.values()]
		.sort((a, b) => {
			if (b.priority !== a.priority) return b.priority - a.priority;
			if (a.competitionId !== b.competitionId) return a.competitionId - b.competitionId;
			if (a.earliestKickoff !== b.earliestKickoff) return a.earliestKickoff - b.earliestKickoff;
			return a.id - b.id;
		})
		.map(({ id, name, subtitle, emblem, href, matches }) => ({
			id,
			name,
			subtitle,
			emblem,
			href,
			matches
		}));
}

/**
 * Visible games for a Lisbon calendar day, split into live (Today only) and day list.
 * Live games (warmup/live) are excluded from the day list when `day` is today.
 */
export async function getGamesForDay(day: string, now = new Date()): Promise<DayGames> {
	const { startNaive, endNaive } = lisbonDayRangeUtc(day);
	const rows = await loadGamesInRange(startNaive, endNaive);

	const needCounts = rows
		.filter((r) => r.goalsHome == null || r.goalsAway == null)
		.map((r) => r.id);
	const counts = await goalCountsByGame(needCounts);

	const today = todayInLisbon();
	const isToday = day === today;

	if (!isToday) {
		return { live: [], groups: groupRows(rows, counts, now) };
	}

	const liveRows: GameRow[] = [];
	const dayRows: GameRow[] = [];

	for (const row of rows) {
		const kickoff = naiveToIso(row.date);
		const status = gameStatus(
			{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
			now
		);
		if (isLiveStatus(status)) liveRows.push(row);
		else dayRows.push(row);
	}

	return {
		live: groupRows(liveRows, counts, now),
		groups: groupRows(dayRows, counts, now)
	};
}

/**
 * Markers for the date rail / month picker.
 * A day with any visible game is `'games'`; today upgrades to `'live'` when
 * any game is in warm-up or live.
 */
export async function getDayMarkers(
	from: string,
	to: string,
	now = new Date()
): Promise<DayMarkers> {
	const { startNaive } = lisbonDayRangeUtc(from);
	const { endNaive } = lisbonDayRangeUtc(to);

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

	const markers: DayMarkers = {};
	const today = todayInLisbon();

	for (const row of rows) {
		const kickoff = naiveToIso(row.date);
		const day = lisbonDayOf(kickoff);
		const status = gameStatus(
			{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
			now
		);

		if (day === today && isLiveStatus(status)) {
			markers[day] = 'live';
		} else if (!markers[day]) {
			markers[day] = 'games';
		}
	}

	return markers;
}

/** Next Lisbon calendar day (after `afterDay`) that has a visible game, or null. */
export async function getNextGameDay(afterDay: string): Promise<string | null> {
	const { endNaive } = lisbonDayRangeUtc(afterDay);

	const [row] = await db
		.select({ date: games.date })
		.from(games)
		.where(and(eq(games.visible, true), sql`${games.date} > ${endNaive}`))
		.orderBy(asc(games.date))
		.limit(1);

	if (!row) return null;
	return lisbonDayOf(naiveToIso(row.date));
}
