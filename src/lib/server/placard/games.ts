/**
 * Games a stadium screen can show. Ports what the old scoreboard-api read from Laravel's
 * `GET /api/games/today` (the day's visible games plus the `test_game_id` variable, for tests)
 * and `GET /api/games/{id}` (the emblems), straight from the database. "Today" is the Lisbon day,
 * like `/jogos`; Laravel used the UTC day.
 */
import { and, asc, eq, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { todayInLisbon } from '#lib/format.ts';
import { gameStatus, lisbonDayRangeUtc } from '#lib/games.ts';
import type { MatchStatus } from '#lib/components/types.ts';
import type { PlacardTeam } from '#lib/placard.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, teams } from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { getVariable } from '#lib/server/legacy-api/http.ts';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

export type PlacardGame = {
	id: number;
	/** Naive UTC, as stored. */
	date: string | Date;
	kickoff: string;
	status: MatchStatus;
	finished: boolean;
	scoreboardUpdates: boolean;
	goalsHome: number | null;
	goalsAway: number | null;
	homeTeamId: number;
	awayTeamId: number;
	homeClubId: number;
	/** `clubs.admin_user_id` of the home club, who may set up its screen. */
	homeClubAdminUserId: number | null;
	home: PlacardTeam;
	away: PlacardTeam;
};

const selectGames = (where: SQL | undefined) =>
	db
		.select({
			id: games.id,
			date: games.date,
			finished: games.finished,
			postponed: games.postponed,
			scoreboardUpdates: games.scoreboardUpdates,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			homeClubId: homeClub.id,
			homeClubAdminUserId: homeClub.adminUserId,
			homeName: homeClub.name,
			homeEmblem: homeClub.emblem,
			awayName: awayClub.name,
			awayEmblem: awayClub.emblem
		})
		.from(games)
		.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(where)
		.orderBy(asc(games.date), asc(games.id));

type Row = Awaited<ReturnType<typeof selectGames>>[number];

function present(row: Row, now: Date): PlacardGame {
	const kickoff = naiveToIso(row.date);
	return {
		id: row.id,
		date: row.date,
		kickoff,
		status: gameStatus(
			{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
			now
		),
		finished: row.finished,
		scoreboardUpdates: row.scoreboardUpdates,
		goalsHome: row.goalsHome,
		goalsAway: row.goalsAway,
		homeTeamId: row.homeTeamId,
		awayTeamId: row.awayTeamId,
		homeClubId: row.homeClubId,
		homeClubAdminUserId: row.homeClubAdminUserId,
		home: { name: row.homeName, emblem: emblemUrl(row.homeEmblem) ?? '' },
		away: { name: row.awayName, emblem: emblemUrl(row.awayEmblem) ?? '' }
	};
}

async function testGameId(): Promise<number | null> {
	const value = await getVariable('test_game_id');
	return value && /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/** Today's visible games (Lisbon day), then the test game if one is set. */
export async function placardGames(now = new Date()): Promise<PlacardGame[]> {
	const { startNaive, endNaive } = lisbonDayRangeUtc(todayInLisbon());
	const testId = await testGameId();
	const today = and(
		eq(games.visible, true),
		sql`${games.date} >= ${startNaive}`,
		sql`${games.date} < ${endNaive}`
	);
	const rows = await selectGames(testId ? or(today, eq(games.id, testId)) : today);
	const list = rows.map((row) => present(row, now));
	// The test game goes last, as on the old screen ("use always the last game of the list").
	return [
		...list.filter((game) => game.id !== testId),
		...list.filter((game) => game.id === testId)
	];
}

/** Whether `gameId` may be put on a screen now: one of today's games or the test game. */
export async function isPlacardGame(gameId: number, now = new Date()): Promise<boolean> {
	return (await placardGames(now)).some((game) => game.id === gameId);
}

export async function placardGame(gameId: number, now = new Date()): Promise<PlacardGame | null> {
	const [row] = await selectGames(eq(games.id, gameId)).limit(1);
	return row ? present(row, now) : null;
}
