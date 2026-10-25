/**
 * Score predictions on the game page (new here; the legacy site had none). One row per user and
 * game in `game_predictions`, editable until kick-off. Rules live in `#lib/predictions.ts`.
 */
import { and, eq, sql } from 'drizzle-orm';
import { hasStarted } from '#lib/games.ts';
import {
	gameKind,
	predictionWindow,
	predictionsOpenAt,
	summarizePredictions,
	validatePrediction,
	type GameKind,
	type Prediction,
	type PredictionSummary
} from '#lib/predictions.ts';
import { db } from '#lib/server/db/index.ts';
import { gameGroups, gamePredictions, games, groupRules } from '#lib/server/db/schema.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import type { ResolvedGame } from '#lib/server/game-page.ts';
import { logger } from '#lib/server/log.ts';

const log = logger.child('predictions');

export type GamePredictions = {
	kind: GameKind;
	/** Inside the window: from `opensAt` until kick-off, and not finished or postponed. */
	open: boolean;
	/** Not open yet: kick-off is more than `PREDICTION_WINDOW_DAYS` away. */
	early: boolean;
	opensAt: string;
	mine: Prediction | null;
	/** Only once the viewer has predicted, or the game has started. */
	summary: PredictionSummary | null;
};

async function rulesTypeOfGroup(groupId: number): Promise<string | null> {
	const [row] = await db
		.select({ type: groupRules.type })
		.from(gameGroups)
		.innerJoin(groupRules, eq(gameGroups.groupRulesId, groupRules.id))
		.where(eq(gameGroups.id, groupId))
		.limit(1);
	return row?.type ?? null;
}

function windowOf(game: { date: string | Date; finished: boolean; postponed: boolean }, now: Date) {
	return predictionWindow(
		{ kickoffIso: naiveToIso(game.date), finished: game.finished, postponed: game.postponed },
		now
	);
}

export async function loadGamePredictions(
	game: ResolvedGame,
	userId: number | null,
	now = new Date()
): Promise<GamePredictions> {
	const [rulesType, mineRow, counts] = await Promise.all([
		rulesTypeOfGroup(game.groupId),
		userId == null
			? null
			: db
					.select({
						home: gamePredictions.goalsHome,
						away: gamePredictions.goalsAway,
						penaltyWinner: gamePredictions.penaltyWinner
					})
					.from(gamePredictions)
					.where(and(eq(gamePredictions.gameId, game.id), eq(gamePredictions.userId, userId)))
					.limit(1)
					.then((rows) => rows[0] ?? null),
		db
			.select({
				goalsHome: gamePredictions.goalsHome,
				goalsAway: gamePredictions.goalsAway,
				penaltyWinner: gamePredictions.penaltyWinner,
				count: sql<number>`COUNT(*)`.mapWith(Number)
			})
			.from(gamePredictions)
			.where(eq(gamePredictions.gameId, game.id))
			.groupBy(gamePredictions.goalsHome, gamePredictions.goalsAway, gamePredictions.penaltyWinner)
	]);

	const kind = gameKind(rulesType);
	const kickoff = naiveToIso(game.date);
	const phase = windowOf(game, now);
	const mine: Prediction | null = mineRow
		? { home: mineRow.home, away: mineRow.away, penaltyWinner: mineRow.penaltyWinner }
		: null;
	// The split stays hidden until you've predicted, so it can't sway your pick. Everyone sees
	// it once the game is under way.
	const showSummary = mine != null || hasStarted(kickoff, now) || game.finished;

	return {
		kind,
		open: phase === 'open',
		early: phase === 'early',
		opensAt: predictionsOpenAt(kickoff).toISOString(),
		mine,
		summary: showSummary ? summarizePredictions(counts, kind) : null
	};
}

export type SavePredictionResult =
	{ ok: true } | { ok: false; error: 'not_found' | 'not_open' | 'closed' | 'invalid' };

/** Creates or replaces the user's prediction while the game hasn't started. */
export async function savePrediction(input: {
	gameId: number;
	userId: number;
	home: unknown;
	away: unknown;
	penaltyWinner: unknown;
	now?: Date;
}): Promise<SavePredictionResult> {
	const now = input.now ?? new Date();

	const [game] = await db
		.select({
			id: games.id,
			date: games.date,
			finished: games.finished,
			postponed: games.postponed,
			visible: games.visible,
			rulesType: groupRules.type
		})
		.from(games)
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(groupRules, eq(gameGroups.groupRulesId, groupRules.id))
		.where(eq(games.id, input.gameId))
		.limit(1);
	if (!game || !game.visible) return { ok: false, error: 'not_found' };
	const phase = windowOf(game, now);
	if (phase !== 'open') {
		log.info(`user ${input.userId} tried to predict ${phase} game ${game.id}`);
		return { ok: false, error: phase === 'early' ? 'not_open' : 'closed' };
	}

	const valid = validatePrediction(
		{ home: input.home, away: input.away, penaltyWinner: input.penaltyWinner },
		gameKind(game.rulesType)
	);
	if (!valid.ok) return { ok: false, error: 'invalid' };

	const { home, away, penaltyWinner } = valid.prediction;
	await db
		.insert(gamePredictions)
		.values({
			gameId: game.id,
			userId: input.userId,
			goalsHome: home,
			goalsAway: away,
			penaltyWinner,
			createdAt: now,
			updatedAt: now
		})
		.onDuplicateKeyUpdate({
			set: { goalsHome: home, goalsAway: away, penaltyWinner, updatedAt: now }
		});

	log.info(
		`user ${input.userId} predicted ${home}-${away}${penaltyWinner ? ` (${penaltyWinner} on penalties)` : ''} for game ${game.id}`
	);
	return { ok: true };
}
