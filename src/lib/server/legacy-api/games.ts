/**
 * Game reads for external clients, ported from Api\GamesController:
 *
 * - `todayMatches` (`GET /api/games/today`): today's visible games. "Today" is the UTC day,
 *   because the legacy app timezone is UTC. A `test_game_id` variable appends that game.
 * - `nextTeamGame` (`GET /api/games/next/{team_id}`): the team's next visible game.
 */
import { and, asc, eq, gt, lte, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { nowNaiveUtc } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, playgrounds, teams } from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { getVariable } from './http.ts';

const DEFAULT_EMBLEM = '/images/default-emblem.png';

/** Ports Club::getEmblem: the stored path as is, or the default emblem. */
export function legacyEmblem(emblem: string | null): string {
	return emblem && emblem !== '0' ? emblem : DEFAULT_EMBLEM;
}

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

function selectGames(where: SQL | undefined) {
	return db
		.select({
			id: games.id,
			date: games.date,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			homeName: homeClub.name,
			homeEmblem: homeClub.emblem,
			awayName: awayClub.name,
			awayEmblem: awayClub.emblem,
			playground: playgrounds.name
		})
		.from(games)
		.innerJoin(homeTeam, eq(homeTeam.id, games.homeTeamId))
		.innerJoin(homeClub, eq(homeClub.id, homeTeam.clubId))
		.innerJoin(awayTeam, eq(awayTeam.id, games.awayTeamId))
		.innerJoin(awayClub, eq(awayClub.id, awayTeam.clubId))
		.leftJoin(playgrounds, eq(playgrounds.id, games.playgroundId))
		.where(where)
		.orderBy(asc(games.date), asc(games.id));
}

type GameRow = Awaited<ReturnType<typeof selectGames>>[number];

export async function todayMatches(now = new Date()): Promise<unknown[]> {
	const day = nowNaiveUtc(now).slice(0, 10);
	const rows = await selectGames(
		and(
			gt(games.date, new Date(`${day}T00:00:00Z`)),
			lte(games.date, new Date(`${day}T23:59:59Z`)),
			eq(games.visible, true)
		)
	);

	const testGameId = await getVariable('test_game_id');
	if (testGameId && testGameId !== '0' && /^\d+$/.test(testGameId.trim())) {
		const [testGame] = await selectGames(eq(games.id, Number(testGameId.trim())));
		if (testGame) rows.push(testGame);
	}

	const counts = await goalCountsByGame([...new Set(rows.map((r) => r.id))]);

	return rows.map((row: GameRow) => {
		const { homeScore, awayScore } = resolveScores(row, counts);
		return {
			id: row.id,
			home_score: homeScore,
			away_score: awayScore,
			home_emblem: legacyEmblem(row.homeEmblem),
			away_emblem: legacyEmblem(row.awayEmblem),
			home_name: row.homeName,
			away_name: row.awayName
		};
	});
}

const lisbon = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Lisbon',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** `Y/m/d H:i` in Europe/Lisbon. */
export function formatLisbon(date: Date): string {
	const parts = Object.fromEntries(lisbon.formatToParts(date).map((p) => [p.type, p.value]));
	return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export async function nextTeamGame(teamId: number, now = new Date()) {
	// Legacy compared Lisbon wall-clock time with the UTC column, skipping games starting
	// within the next hour or so. Compare with UTC now.
	const upcoming = and(gt(games.date, now), eq(games.visible, true));
	const [gameHome] = await selectGames(and(upcoming, eq(games.homeTeamId, teamId))).limit(1);
	const [gameAway] = await selectGames(and(upcoming, eq(games.awayTeamId, teamId))).limit(1);

	if (!gameHome && !gameAway) return { has_game: false };

	let game = gameHome ?? gameAway;
	if (gameHome && gameAway) {
		game = new Date(gameAway.date) < new Date(gameHome.date) ? gameAway : gameHome;
	}

	return {
		has_game: true,
		home_team: game.homeName,
		home_emblem: legacyEmblem(game.homeEmblem),
		away_team: game.awayName,
		away_team_emblem: legacyEmblem(game.awayEmblem),
		// Legacy crashed (500) on a game without a playground.
		ground: game.playground ?? 'Desconhecido',
		date: formatLisbon(new Date(game.date))
	};
}
