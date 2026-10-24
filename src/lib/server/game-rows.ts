/**
 * Game list rows shared by pages that list games outside a day or round view: the game page
 * (recent form, head to head) and the stadium page. One select with the competition and both
 * clubs joined, and the mapping to the `Match` shape MatchRow renders.
 */
import type { SQL } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import type { Match } from '#lib/components/types.ts';
import { gameHref, gameStatus } from '#lib/games.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, competitions, gameGroups, games, seasons, teams } from '#lib/server/db/schema.ts';
import { emblemUrl, resolveScores } from '#lib/server/games.ts';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

export type TeamGameRow = {
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
	groupName: string | null;
	startYear: number;
	endYear: number;
	seasonName: string | null;
	competitionName: string;
	homeClubName: string;
	homeClubEmblem: string | null;
	awayClubName: string;
	awayClubEmblem: string | null;
};

/** The rows matching `where`; the caller adds the order, limit and offset. */
export function selectGameRows(where: SQL | undefined) {
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
			groupName: gameGroups.name,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			seasonName: seasons.name,
			competitionName: competitions.name,
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
		.where(where);
}

/** The season's own name, else the competition's (Season::getDisplayName). */
export function rowDisplayName(row: Pick<TeamGameRow, 'seasonName' | 'competitionName'>): string {
	return row.seasonName?.trim() || row.competitionName;
}

export function toMatch(
	row: TeamGameRow,
	counts: Map<number, Map<number, number>>,
	now: Date
): Match {
	const kickoff = naiveToIso(row.date);
	const status = gameStatus(
		{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
		now
	);
	const { homeScore, awayScore } = resolveScores(row, counts);
	const display = rowDisplayName(row);
	const groupName = row.groupName?.trim() || display;
	const showScore = status === 'live' || status === 'finished';
	const decidedByPenalties =
		showScore && homeScore === awayScore && row.penaltiesHome != null && row.penaltiesAway != null;

	return {
		id: row.id,
		href: gameHref({
			startYear: row.startYear,
			endYear: row.endYear,
			displayName: display,
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
		penalties: decidedByPenalties ? { home: row.penaltiesHome!, away: row.penaltiesAway! } : null
	};
}
