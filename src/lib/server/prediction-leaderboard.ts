/**
 * Prediction leaderboard (`/previsoes`). New in this app (the legacy site had none). Every
 * prediction on a finished game is judged with `judgePrediction` and scored with
 * `predictionPoints` (3 exact, 1 right winner or draw), then ranked per period by the kick-off
 * of the game: the last 7 days, the last 30 days and all time.
 */
import { and, eq, inArray, isNotNull, or } from 'drizzle-orm';
import {
	gameKind,
	judgePrediction,
	predictionPoints,
	rankLeaderboard,
	type LeaderboardTally
} from '#lib/predictions.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	gameGroups,
	gamePredictions,
	games,
	groupRules,
	userProfiles,
	users
} from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { mediaUrl } from '#lib/server/media.ts';

export const LEADERBOARD_SIZE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
/** The board is the same for everyone, so it's built once and reused for a short while. */
const CACHE_MS = 2 * 60 * 1000;

export type LeaderboardPeriod = 'week' | 'month' | 'allTime';

export type LeaderboardEntry = {
	userId: number;
	position: number;
	name: string;
	picture: string | null;
	points: number;
	exact: number;
	correct: number;
	total: number;
};

export type LeaderboardView = {
	entries: LeaderboardEntry[];
	/** The viewer's row when they're ranked but outside `entries`. */
	me: LeaderboardEntry | null;
};

export type Leaderboard = Record<LeaderboardPeriod, LeaderboardView>;

type User = { name: string; picture: string | null };
type Ranked = LeaderboardTally & { position: number; name: string; picture: string | null };
type Boards = Record<LeaderboardPeriod, Ranked[]>;

let cache: { at: number; boards: Promise<Boards> } | null = null;

/** Every finished game's predictions, judged with the score the game page shows. */
async function judgedPredictions() {
	const rows = await db
		.select({
			userId: gamePredictions.userId,
			gameId: games.id,
			home: gamePredictions.goalsHome,
			away: gamePredictions.goalsAway,
			penaltyWinner: gamePredictions.penaltyWinner,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			rulesType: groupRules.type
		})
		.from(gamePredictions)
		.innerJoin(games, eq(gamePredictions.gameId, games.id))
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(groupRules, eq(gameGroups.groupRulesId, groupRules.id))
		.where(and(eq(games.finished, true), eq(games.visible, true), eq(games.postponed, false)));

	// Games with no score typed in fall back to their goal events, like everywhere else.
	const counts = await goalCountsByGame([
		...new Set(rows.filter((r) => r.goalsHome == null || r.goalsAway == null).map((r) => r.gameId))
	]);

	return rows.map((row) => {
		const { homeScore, awayScore } = resolveScores({ ...row, id: row.gameId }, counts);
		const penalties =
			homeScore === awayScore && row.penaltiesHome != null && row.penaltiesAway != null
				? { home: row.penaltiesHome, away: row.penaltiesAway }
				: null;
		const verdict = judgePrediction(
			{ home: row.home, away: row.away, penaltyWinner: row.penaltyWinner },
			{ home: homeScore, away: awayScore, penalties },
			gameKind(row.rulesType)
		);
		return {
			userId: row.userId,
			kickoff: new Date(naiveToIso(row.date)).getTime(),
			points: predictionPoints(verdict)
		};
	});
}

/** Names and photos, leaving out deleted accounts (the legacy job blanks name and email). */
async function loadUsers(ids: number[]): Promise<Map<number, User>> {
	if (ids.length === 0) return new Map();
	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			picture: userProfiles.picture
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(and(inArray(users.id, ids), or(isNotNull(users.name), isNotNull(users.email))));
	return new Map(
		rows.map((row) => [
			row.id,
			{
				// Same fallback as the signed-in user's name (toAuthUser).
				name: row.name?.trim() || row.email?.split('@')[0] || 'Utilizador',
				picture: mediaUrl(row.picture)
			}
		])
	);
}

async function buildBoards(now: Date): Promise<Boards> {
	const predictions = await judgedPredictions();
	const since: Record<LeaderboardPeriod, number> = {
		week: now.getTime() - 7 * DAY_MS,
		month: now.getTime() - 30 * DAY_MS,
		allTime: -Infinity
	};

	const tallies: Record<LeaderboardPeriod, Map<number, LeaderboardTally>> = {
		week: new Map(),
		month: new Map(),
		allTime: new Map()
	};
	for (const prediction of predictions) {
		for (const period of Object.keys(since) as LeaderboardPeriod[]) {
			if (prediction.kickoff < since[period]) continue;
			const byUser = tallies[period];
			let tally = byUser.get(prediction.userId);
			if (!tally) {
				tally = { userId: prediction.userId, points: 0, exact: 0, correct: 0, total: 0 };
				byUser.set(prediction.userId, tally);
			}
			tally.points += prediction.points;
			tally.total += 1;
			if (prediction.points === 3) tally.exact += 1;
			else if (prediction.points === 1) tally.correct += 1;
		}
	}

	const people = await loadUsers([...tallies.allTime.keys()]);
	const board = (period: LeaderboardPeriod): Ranked[] =>
		rankLeaderboard(
			[...tallies[period].values()].flatMap((tally) => {
				const user = people.get(tally.userId);
				return user ? [{ ...tally, ...user }] : [];
			}),
			(a, b) => a.name.localeCompare(b.name, 'pt')
		);

	return { week: board('week'), month: board('month'), allTime: board('allTime') };
}

function boards(now: Date): Promise<Boards> {
	if (!cache || now.getTime() - cache.at > CACHE_MS) {
		const built = buildBoards(now);
		cache = { at: now.getTime(), boards: built };
		// A failed build isn't kept, so the next request tries again.
		built.catch(() => {
			if (cache?.boards === built) cache = null;
		});
	}
	return cache.boards;
}

function toView(ranked: Ranked[], viewerId: number | null): LeaderboardView {
	const entries = ranked.slice(0, LEADERBOARD_SIZE);
	const inTop = viewerId != null && entries.some((entry) => entry.userId === viewerId);
	const me = viewerId == null || inTop ? null : (ranked.find((r) => r.userId === viewerId) ?? null);
	return { entries, me };
}

export async function loadLeaderboard(
	viewerId: number | null,
	now = new Date()
): Promise<Leaderboard> {
	const all = await boards(now);
	return {
		week: toView(all.week, viewerId),
		month: toView(all.month, viewerId),
		allTime: toView(all.allTime, viewerId)
	};
}
