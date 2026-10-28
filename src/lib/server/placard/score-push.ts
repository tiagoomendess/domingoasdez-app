/**
 * The score push of the stadium screen ("placard"): the core of Api\GamesController@
 * scoreboardUpdated, shared by the legacy `PUT /api/games/{game}/scoreboard-updated` (external
 * scoreboards, token auth) and the screens of `/placard` (signed-in controllers).
 *
 * The old scoreboard-api pushed on every tap (clock taps too) and forwarded whatever `matchId`
 * the client sent; `/placard` only pushes score changes, for the game the screen is paired with.
 */
import { and, eq, gt, sql } from 'drizzle-orm';
import { hasStarted } from '#lib/games.ts';
import type { ScorePushResult } from '#lib/placard.ts';
import { naiveToIso, nowNaiveUtc } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { games, scoreReports } from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { ensureUuidKarma } from '#lib/server/score-reports.ts';

export type PushGame = Pick<
	typeof games.$inferSelect,
	'id' | 'finished' | 'scoreboardUpdates' | 'goalsHome' | 'goalsAway' | 'homeTeamId' | 'awayTeamId'
> & { date: string | Date };

export type { ScorePushResult } from '#lib/placard.ts';

/** Same score from the placard within this window: one report only. */
const DEDUPE_MS = 5 * 60_000;

export async function pushPlacardScore(input: {
	game: PushGame;
	homeScore: number;
	awayScore: number;
	uuid?: string | null;
	userId?: number | null;
	now?: Date;
}): Promise<ScorePushResult> {
	const { game, homeScore, awayScore } = input;
	const now = input.now ?? new Date();
	const uuid = input.uuid ?? null;

	if (!hasStarted(naiveToIso(game.date), now) || game.finished) return 'not_live';

	await ensureUuidKarma(uuid);

	const counts = await goalCountsByGame([game.id]);
	const current = resolveScores(game, counts);

	const since = nowNaiveUtc(new Date(now.getTime() - DEDUPE_MS));
	const [existing] = await db
		.select({ n: sql<number>`count(*)`.mapWith(Number) })
		.from(scoreReports)
		.where(
			and(
				eq(scoreReports.gameId, game.id),
				eq(scoreReports.homeScore, homeScore),
				eq(scoreReports.awayScore, awayScore),
				eq(scoreReports.source, 'placard'),
				gt(scoreReports.createdAt, sql`${since}`)
			)
		);

	if (!existing?.n) {
		await db.insert(scoreReports).values({
			gameId: game.id,
			userId: input.userId ?? null,
			homeScore,
			awayScore,
			source: 'placard',
			uuid,
			createdAt: now,
			updatedAt: now
		});
	}

	if (!game.scoreboardUpdates) return 'not_allowed';
	if (homeScore === current.homeScore && awayScore === current.awayScore) return 'unchanged';

	await db
		.update(games)
		.set({ goalsHome: homeScore, goalsAway: awayScore, updatedAt: now })
		.where(eq(games.id, game.id));
	return 'updated';
}
