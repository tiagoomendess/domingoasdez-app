/**
 * Score reports sent by external clients through the legacy API.
 *
 * - `storeScoreReport` ports Api\ScoreReportsController@store (`POST /api/score-reports/{game}`).
 * - `scoreboardUpdated` ports Api\GamesController@scoreboardUpdated
 *   (`PUT /api/games/{game}/scoreboard-updated`), the stadium scoreboard ("placard").
 *
 * Both run after the access-token check. Unlike the website's form, they don't check bans,
 * rate limits or karma: they only make sure the uuid has a karma row.
 */
import { and, eq, gt, sql } from 'drizzle-orm';
import { hasStarted } from '#lib/games.ts';
import { naiveToIso, nowNaiveUtc } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { games, scoreReports } from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { ensureUuidKarma } from '#lib/server/score-reports.ts';
import { legacyJson } from './http.ts';
import { isNumeric, phpString, strLimit } from './php.ts';
import { validate, type Rules } from './validate.ts';

export const SCORE_REPORT_RULES: Rules = {
	user_id: ['integer', 'nullable'],
	home_score: ['required', 'integer', 'min:0', 'max:32'],
	away_score: ['required', 'integer', 'min:0', 'max:32'],
	latitude: ['numeric', 'nullable'],
	longitude: ['numeric', 'nullable'],
	accuracy: ['numeric', 'nullable'],
	ip_address: ['string', 'max:155', 'nullable'],
	redirect_to: ['string', 'max:255', 'nullable'],
	finished: ['boolean', 'nullable'],
	uuid: ['string', 'required', 'max:36', 'nullable']
};

export const SCOREBOARD_RULES: Rules = {
	home_score: ['required', 'min:0', 'max:99', 'integer'],
	away_score: ['required', 'min:0', 'max:99', 'integer'],
	uuid: ['string', 'max:36', 'nullable']
};

export type ApiGame = typeof games.$inferSelect;

/** Route-model binding for `{game}`: the game by id, visible or not. */
export async function findGameForBinding(param: string): Promise<ApiGame | null> {
	if (!/^\d+$/.test(param)) return null;
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.id, Number(param)))
		.limit(1);
	return game ?? null;
}

/** PHP `empty()`. */
function phpEmpty(value: unknown): boolean {
	return (
		value == null ||
		value === false ||
		value === '' ||
		value === '0' ||
		value === 0 ||
		(Array.isArray(value) && value.length === 0)
	);
}

/** Laravel `$request->input($key, $default)`: the default only when the key is missing. */
function input(all: Record<string, unknown>, key: string, fallback: unknown = null): unknown {
	return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : fallback;
}

function toInt(value: unknown): number {
	return Math.trunc(Number(value));
}

function toBool(value: unknown): boolean {
	return value === true || value === 1 || value === '1' || value === 'true';
}

export async function storeScoreReport(input_: {
	game: ApiGame;
	all: Record<string, unknown>;
	userAgent: string | null;
}): Promise<Response> {
	const { game, all } = input_;

	const errors = await validate(all, SCORE_REPORT_RULES);
	if (errors) {
		// Legacy built this with `response('', 400)->json(…)`, which threw and returned a 500.
		return legacyJson({ message: 'Bad Request did not meet validation rules', errors }, 400);
	}

	const source = strLimit(`api_${phpString(input(all, 'source', 'unknown'))}`, 25, '');
	const latitude = all.latitude;
	const longitude = all.longitude;
	// Both are validated as numeric, so the WKT is safe; it is still sent as a parameter.
	const point =
		phpEmpty(latitude) || phpEmpty(longitude)
			? null
			: `POINT(${Number(latitude)} ${Number(longitude)})`;

	let accuracy: number | null = null;
	if (!phpEmpty(all.accuracy) && isNumeric(all.accuracy)) {
		accuracy = Math.min(Number(all.accuracy), 1000);
	}

	const ipAddress = all.ip_address == null ? null : strLimit(phpString(all.ip_address), 45, '');
	const userAgent = input_.userAgent == null ? null : strLimit(input_.userAgent, 255, '');
	const userId = all.user_id == null ? null : toInt(all.user_id);
	const uuid = phpString(all.uuid);
	const finished = toBool(input(all, 'finished', false));
	const now = nowNaiveUtc();

	await db.execute(sql`
		INSERT INTO score_reports (
			user_id, game_id, home_score, away_score, source, ip_address, user_agent,
			location, location_accuracy, uuid, finished, created_at, updated_at
		) VALUES (
			${userId},
			${game.id},
			${toInt(all.home_score)},
			${toInt(all.away_score)},
			${source},
			${ipAddress},
			${userAgent},
			${point === null ? null : sql`ST_GeomFromText(${point})`},
			${accuracy},
			${uuid},
			${finished},
			${now},
			${now}
		)
	`);

	await ensureUuidKarma(uuid);

	return legacyJson({ message: 'Score report created successfully' });
}

export async function scoreboardUpdated(input_: {
	game: ApiGame;
	all: Record<string, unknown>;
	json: Record<string, unknown>;
	now?: Date;
}): Promise<Response> {
	const { game, all, json } = input_;
	const now = input_.now ?? new Date();

	const errors = await validate(all, SCOREBOARD_RULES);
	if (errors) {
		return legacyJson({ success: false, message: 'Dados inválidos!' }, 400);
	}

	const kickoffIso = naiveToIso(game.date);
	if (!hasStarted(kickoffIso, now) || game.finished) {
		return legacyJson({ success: false, message: 'O jogo ainda não começou ou já terminou!' }, 400);
	}

	// Legacy read these from the JSON body; fall back to the form body instead of failing.
	const uuidValue = json.uuid !== undefined ? json.uuid : all.uuid;
	const uuid = uuidValue == null ? null : phpString(uuidValue);
	await ensureUuidKarma(uuid);

	const homeScore = toInt(json.home_score ?? all.home_score);
	const awayScore = toInt(json.away_score ?? all.away_score);
	const counts = await goalCountsByGame([game.id]);
	const current = resolveScores(game, counts);

	const fiveMinutesAgo = nowNaiveUtc(new Date(now.getTime() - 5 * 60_000));
	const [existing] = await db
		.select({ n: sql<number>`count(*)`.mapWith(Number) })
		.from(scoreReports)
		.where(
			and(
				eq(scoreReports.gameId, game.id),
				eq(scoreReports.homeScore, homeScore),
				eq(scoreReports.awayScore, awayScore),
				eq(scoreReports.source, 'placard'),
				gt(scoreReports.createdAt, sql`${fiveMinutesAgo}`)
			)
		);

	if (!existing?.n) {
		await db.insert(scoreReports).values({
			gameId: game.id,
			homeScore,
			awayScore,
			source: 'placard',
			uuid,
			createdAt: now,
			updatedAt: now
		});
	}

	if (!game.scoreboardUpdates) {
		return legacyJson({
			success: false,
			message: 'Este jogo não aceita atualizações de resultado via placard!'
		});
	}

	if (homeScore === current.homeScore && awayScore === current.awayScore) {
		// Legacy sent a JSON body with the 304; a 304 can't carry one.
		return new Response(null, { status: 304 });
	}

	await db
		.update(games)
		.set({ goalsHome: homeScore, goalsAway: awayScore, updatedAt: now })
		.where(eq(games.id, game.id));

	return legacyJson({ success: true, message: 'Resultado atualizado com sucesso!' });
}
