/**
 * State of the stadium screens: what they show, pairing, the controller's actions and releasing a
 * screen. Replaces the old scoreboard-api's in-memory list, where the phone overwrote the whole
 * object with every tap (two phones, or two quick taps, lost changes). Here every action is applied
 * on the stored state inside a transaction (`SELECT … FOR UPDATE`), bumps `version` and is logged
 * in `placard_events`.
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import { renderSVG } from 'uqr';
import {
	adAvailableAt,
	applyAction,
	initialClock,
	MAX_SCORE,
	nextAdAfter,
	PLACARD_PERIODS,
	type PlacardAction,
	type PlacardMatchState,
	type PlacardOverlay,
	type PlacardPeriod,
	type PlacardPublicState,
	type PlacardSubPlayer,
	MESSAGE_MS,
	normalizeMessage,
	SUBSTITUTION_MS
} from '#lib/placard.ts';
import { db } from '#lib/server/db/index.ts';
import { placardEvents, placards } from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { clubAdRows, clubAdSpots } from './club-setup.ts';
import type { PlacardRow } from './device.ts';
import { placardGame, type PlacardGame } from './games.ts';
import { pushPlacardScore, type ScorePushResult } from './score-push.ts';
import { placardSquads } from './squads.ts';
import { resolvePlacardTheme } from './theme.ts';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A screen nobody has touched for this long goes back to its pairing code. */
export const IDLE_RELEASE_MS = 6 * 60 * 60_000;
/** …and sooner once its game is finished. */
export const FINISHED_RELEASE_MS = 60 * 60_000;

const isPeriod = (value: string): value is PlacardPeriod =>
	(PLACARD_PERIODS as readonly string[]).includes(value);

export function matchState(row: PlacardRow): PlacardMatchState {
	return {
		homeScore: row.homeScore,
		awayScore: row.awayScore,
		clock: {
			elapsedMs: row.clockElapsedMs,
			runningSince: row.clockRunningSince ? row.clockRunningSince.getTime() : null,
			period: isPeriod(row.period) ? row.period : 'first_half'
		}
	};
}

function matchColumns(state: PlacardMatchState) {
	return {
		homeScore: state.homeScore,
		awayScore: state.awayScore,
		clockElapsedMs: Math.round(state.clock.elapsedMs),
		clockRunningSince:
			state.clock.runningSince === null ? null : new Date(state.clock.runningSince),
		period: state.clock.period
	};
}

/** No overlay, no ad history: a screen starting on a game, or leaving it. */
const NO_OVERLAY = {
	overlayType: null,
	overlayPayload: null,
	overlayStartedAt: null,
	overlayEndsAt: null,
	lastAdAt: null,
	nextAdId: null
} as const;

/** Everything a released screen loses; the code is cleared so the TV draws a new one. */
const RELEASED = {
	scene: 'pairing',
	pairingCode: null,
	pairingCodeExpiresAt: null,
	gameId: null,
	controllerUserId: null,
	pairedAt: null,
	...NO_OVERLAY,
	...matchColumns({ homeScore: 0, awayScore: 0, clock: initialClock() })
} as const;

/**
 * The overlay a screen shows at `now`, or null once it's over. Rows keep an expired overlay
 * (nothing clears it); it's simply ignored. Each overlay type reads its own payload here.
 */
export function currentOverlay(
	row: PlacardRow,
	now: Date,
	game: Pick<PlacardGame, 'home' | 'away'> | null = null
): PlacardOverlay | null {
	if (!row.overlayType || !row.overlayStartedAt || !row.overlayEndsAt) return null;
	if (row.overlayEndsAt.getTime() <= now.getTime()) return null;
	const startedAt = row.overlayStartedAt.getTime();
	const endsAt = row.overlayEndsAt.getTime();
	const payload = (row.overlayPayload ?? {}) as Record<string, unknown>;
	switch (row.overlayType) {
		case 'ad':
			if (typeof payload.adId !== 'number' || typeof payload.image !== 'string') return null;
			return {
				type: 'ad',
				startedAt,
				endsAt,
				ad: { id: payload.adId, image: mediaUrl(payload.image) ?? '' }
			};
		case 'substitution': {
			const out = subPlayer(payload.out);
			const incoming = subPlayer(payload.in);
			if (!out || !incoming || !game) return null;
			if (payload.side !== 'home' && payload.side !== 'away') return null;
			return {
				type: 'substitution',
				startedAt,
				endsAt,
				side: payload.side,
				team: payload.side === 'home' ? game.home : game.away,
				out,
				in: incoming
			};
		}
		case 'message': {
			const text = normalizeMessage(payload.text);
			return text ? { type: 'message', startedAt, endsAt, text } : null;
		}
		default:
			return null;
	}
}

/** Whether any overlay is still on (whatever its type), for refusing a second one. */
export const overlayActive = (row: PlacardRow, now: Date) =>
	row.overlayEndsAt !== null && row.overlayEndsAt.getTime() > now.getTime();

/** A stored substitution player (`picture` as a path), with its photo as a browser URL. */
function subPlayer(value: unknown): PlacardSubPlayer | null {
	const player = value as { id?: unknown; name?: unknown; picture?: unknown } | null;
	if (!player || typeof player.id !== 'number' || typeof player.name !== 'string') return null;
	return {
		id: player.id,
		name: player.name,
		picture: typeof player.picture === 'string' ? mediaUrl(player.picture) : null
	};
}

async function logEvent(
	tx: Tx | typeof db,
	values: {
		placardId: number;
		gameId: number | null;
		userId: number | null;
		type: string;
		payload?: unknown;
		now: Date;
	}
) {
	await tx.insert(placardEvents).values({
		placardId: values.placardId,
		gameId: values.gameId,
		userId: values.userId,
		type: values.type,
		payload: values.payload ?? null,
		createdAt: values.now
	});
}

async function findForUpdate(tx: Tx, id: number): Promise<PlacardRow | undefined> {
	const [row] = await tx.select().from(placards).where(eq(placards.id, id)).for('update');
	return row;
}

export async function findPlacard(id: number): Promise<PlacardRow | null> {
	const [row] = await db.select().from(placards).where(eq(placards.id, id)).limit(1);
	return row ?? null;
}

/**
 * The screen as the TV and the controller see it. `origin` builds the pairing link; `withQr` is
 * for the TV, `forController` adds what the controller's buttons need (the home club's ads).
 */
export async function publicState(
	row: PlacardRow,
	options: { origin: string; withQr?: boolean; forController?: boolean; now?: Date }
): Promise<PlacardPublicState> {
	const now = options.now ?? new Date();
	const game = row.scene === 'match' && row.gameId ? await placardGame(row.gameId, now) : null;
	const theme = await resolvePlacardTheme(game?.homeClubId ?? null);

	let pairing: PlacardPublicState['pairing'] = null;
	if (row.scene === 'pairing' && row.pairingCode && row.pairingCodeExpiresAt) {
		const url = `${options.origin}/placard/ligar/${row.pairingCode}`;
		pairing = {
			code: row.pairingCode,
			expiresAt: row.pairingCodeExpiresAt.getTime(),
			url,
			qrSvg: options.withQr ? renderSVG(url, { border: 1 }) : ''
		};
	}

	let controls: PlacardPublicState['controls'] = null;
	if (options.forController && game) {
		const ads = await clubAdSpots(game.homeClubId);
		controls = {
			ads,
			nextAdId: (ads.find((ad) => ad.id === row.nextAdId) ?? ads[0])?.id ?? null,
			adAvailableAt: adAvailableAt(row.lastAdAt?.getTime() ?? null)
		};
	}

	const state = matchState(row);
	return {
		id: row.id,
		version: row.version,
		serverNow: now.getTime(),
		scene: game ? 'match' : 'pairing',
		pairing,
		match: game
			? {
					gameId: game.id,
					home: game.home,
					away: game.away,
					homeScore: state.homeScore,
					awayScore: state.awayScore,
					clock: state.clock,
					scoreboardUpdates: game.scoreboardUpdates
				}
			: null,
		overlay: game ? currentOverlay(row, now, game) : null,
		theme,
		controls
	};
}

/**
 * Whether a screen showing a game should go back to pairing: its game is gone, nobody touched it
 * for 6 h, or its game is finished and nobody touched it for an hour. The app has no cron, so the
 * polls check this.
 */
export function shouldRelease(row: PlacardRow, game: PlacardGame | null, now: Date): boolean {
	if (row.scene !== 'match') return false;
	if (!row.gameId || !game) return true;
	const idle = now.getTime() - (row.lastActionAt ?? row.pairedAt ?? now).getTime();
	return idle >= IDLE_RELEASE_MS || (game.finished && idle >= FINISHED_RELEASE_MS);
}

async function release(tx: Tx, row: PlacardRow, userId: number | null, type: string, now: Date) {
	await tx
		.update(placards)
		.set({ ...RELEASED, lastActionAt: now, version: sql`${placards.version} + 1`, updatedAt: now })
		.where(eq(placards.id, row.id));
	await logEvent(tx, { placardId: row.id, gameId: row.gameId, userId, type, now });
}

/** Releases the screen when `shouldRelease` says so; returns the row as it is now. */
export async function releaseIfStale(row: PlacardRow, now = new Date()): Promise<PlacardRow> {
	if (row.scene !== 'match') return row;
	const game = row.gameId ? await placardGame(row.gameId, now) : null;
	if (!shouldRelease(row, game, now)) return row;
	await db.transaction(async (tx) => {
		const current = await findForUpdate(tx, row.id);
		if (current && shouldRelease(current, game, now))
			await release(tx, current, null, 'auto_release', now);
	});
	return (await findPlacard(row.id)) ?? row;
}

export type PairResult = { ok: true; placardId: number } | { ok: false; reason: 'invalid_code' };

/**
 * Puts the screen showing `code` on `game`, controlled by `userId`. Starts from the game's current
 * score, not 0:0 (pairing mid-game kept the old screen at 0:0 until someone tapped it up).
 */
export async function pairPlacard(input: {
	code: string;
	game: PlacardGame;
	userId: number;
	now?: Date;
}): Promise<PairResult> {
	const now = input.now ?? new Date();
	const { game } = input;
	const counts = await goalCountsByGame([game.id]);
	const score = resolveScores(game, counts);

	const placardId = await db.transaction(async (tx) => {
		const [row] = await tx
			.select()
			.from(placards)
			.where(and(eq(placards.pairingCode, input.code), eq(placards.scene, 'pairing')))
			.for('update');
		if (!row || !row.pairingCodeExpiresAt || row.pairingCodeExpiresAt <= now) return null;

		await tx
			.update(placards)
			.set({
				scene: 'match',
				pairingCode: null,
				pairingCodeExpiresAt: null,
				gameId: game.id,
				controllerUserId: input.userId,
				...matchColumns({
					homeScore: Math.min(MAX_SCORE, score.homeScore),
					awayScore: Math.min(MAX_SCORE, score.awayScore),
					clock: initialClock()
				}),
				...NO_OVERLAY,
				pairedAt: now,
				lastActionAt: now,
				version: sql`${placards.version} + 1`,
				updatedAt: now
			})
			.where(eq(placards.id, row.id));
		await logEvent(tx, {
			placardId: row.id,
			gameId: game.id,
			userId: input.userId,
			type: 'pair',
			now
		});
		return row.id;
	});

	return placardId ? { ok: true, placardId } : { ok: false, reason: 'invalid_code' };
}

export type ActionResult =
	| { ok: true; row: PlacardRow; scorePush: ScorePushResult | null }
	| {
			ok: false;
			reason:
				| 'not_found'
				| 'forbidden'
				| 'not_paired'
				| 'ad_not_found'
				| 'ad_cooldown'
				| 'player_not_found'
				| 'busy';
	  };

/**
 * Starts an ad break with `adId`, one of the home club's ads, unless one started less than 2
 * minutes ago or another overlay is still on. The ad after it (in position order) becomes the
 * preselected one, so the controller can just press again next time.
 */
async function startAdBreak(tx: Tx, row: PlacardRow, adId: number, userId: number, now: Date) {
	const game = row.gameId ? await placardGame(row.gameId, now) : null;
	const ads = game ? await clubAdRows(game.homeClubId) : [];
	const ad = ads.find((spot) => spot.id === adId);
	if (!ad) return 'ad_not_found' as const;
	if (now.getTime() < adAvailableAt(row.lastAdAt?.getTime() ?? null)) return 'ad_cooldown' as const;
	if (overlayActive(row, now)) return 'busy' as const;

	await startOverlay(tx, row, {
		type: 'ad',
		// The stored path, not a URL: the media origin (or CDN) is added when it's read.
		payload: { adId: ad.id, image: ad.image },
		durationMs: ad.durationSeconds * 1000,
		now,
		extra: { lastAdAt: now, nextAdId: nextAdAfter(ads, ad.id)?.id ?? null }
	});
	await logEvent(tx, {
		placardId: row.id,
		gameId: row.gameId,
		userId,
		type: 'show_ad',
		payload: { adId: ad.id, durationSeconds: ad.durationSeconds },
		now
	});
	return 'done' as const;
}

/** Puts an overlay on the screen for `durationMs` from `now` (any overlay type). */
async function startOverlay(
	tx: Tx,
	row: PlacardRow,
	overlay: {
		type: PlacardOverlay['type'];
		payload: Record<string, unknown>;
		durationMs: number;
		now: Date;
		extra?: Partial<typeof placards.$inferInsert>;
	}
) {
	const { now } = overlay;
	await tx
		.update(placards)
		.set({
			overlayType: overlay.type,
			overlayPayload: overlay.payload,
			overlayStartedAt: now,
			overlayEndsAt: new Date(now.getTime() + overlay.durationMs),
			...overlay.extra,
			lastActionAt: now,
			version: sql`${placards.version} + 1`,
			updatedAt: now
		})
		.where(eq(placards.id, row.id));
}

/**
 * Shows the controller's own text (a raffle winner, a notice to the stands) for 15 s. `text` was
 * normalised and length-checked by `parseAction`. It's logged with the event, so the admin can
 * see who sent what.
 */
async function startMessage(tx: Tx, row: PlacardRow, text: string, userId: number, now: Date) {
	if (overlayActive(row, now)) return 'busy' as const;
	await startOverlay(tx, row, { type: 'message', payload: { text }, durationMs: MESSAGE_MS, now });
	await logEvent(tx, {
		placardId: row.id,
		gameId: row.gameId,
		userId,
		type: 'show_message',
		payload: { text },
		now
	});
	return 'done' as const;
}

/**
 * Shows a substitution for 10 s: `outPlayerId` leaves, `inPlayerId` comes on, both from the
 * squad of the `side` team. Names, photo paths and the club are copied into the overlay, so
 * the screen shows what was sent even if a player is edited meanwhile. Refused while another
 * overlay (an ad, a substitution) is still on.
 */
async function startSubstitution(
	tx: Tx,
	row: PlacardRow,
	action: Extract<PlacardAction, { type: 'show_substitution' }>,
	userId: number,
	now: Date
) {
	const game = row.gameId ? await placardGame(row.gameId, now) : null;
	if (!game) return 'not_paired' as const;
	const squad = (await placardSquads(game, now))[action.side];
	const out = squad.find((player) => player.id === action.outPlayerId);
	const incoming = squad.find((player) => player.id === action.inPlayerId);
	if (!out || !incoming || out.id === incoming.id) return 'player_not_found' as const;
	if (overlayActive(row, now)) return 'busy' as const;

	await startOverlay(tx, row, {
		type: 'substitution',
		payload: { side: action.side, out, in: incoming },
		durationMs: SUBSTITUTION_MS,
		now
	});
	await logEvent(tx, {
		placardId: row.id,
		gameId: row.gameId,
		userId,
		type: 'show_substitution',
		payload: { side: action.side, outPlayerId: out.id, inPlayerId: incoming.id },
		now
	});
	return 'done' as const;
}

/**
 * Applies a controller's action. `canControl` is checked again on the locked row, so a screen
 * released (or taken over) in the meantime refuses it. Score changes are then pushed to the
 * game with the score stored *now*, so concurrent taps settle on the latest one.
 */
export async function applyPlacardAction(input: {
	placardId: number;
	userId: number;
	action: PlacardAction;
	canControl: (row: PlacardRow) => boolean;
	now?: Date;
}): Promise<ActionResult> {
	const now = input.now ?? new Date();
	const { action } = input;

	const outcome = await db.transaction(async (tx) => {
		const row = await findForUpdate(tx, input.placardId);
		if (!row) return 'not_found' as const;
		if (!input.canControl(row)) return 'forbidden' as const;
		if (row.scene !== 'match') return 'not_paired' as const;

		if (action.type === 'end') {
			await release(tx, row, input.userId, 'end', now);
			return 'done' as const;
		}
		if (action.type === 'show_ad') return startAdBreak(tx, row, action.adId, input.userId, now);
		if (action.type === 'show_substitution') {
			return startSubstitution(tx, row, action, input.userId, now);
		}
		if (action.type === 'show_message')
			return startMessage(tx, row, action.text, input.userId, now);

		const next = applyAction(matchState(row), action, now.getTime());
		await tx
			.update(placards)
			.set({
				...matchColumns(next),
				lastActionAt: now,
				version: sql`${placards.version} + 1`,
				updatedAt: now
			})
			.where(eq(placards.id, row.id));
		const { type, ...details } = action;
		await logEvent(tx, {
			placardId: row.id,
			gameId: row.gameId,
			userId: input.userId,
			type,
			payload: { ...details, homeScore: next.homeScore, awayScore: next.awayScore },
			now
		});
		return 'done' as const;
	});
	if (outcome !== 'done') return { ok: false, reason: outcome };

	const row = (await findPlacard(input.placardId))!;
	let scorePush: ScorePushResult | null = null;
	if (action.type === 'score' && row.scene === 'match' && row.gameId) {
		const game = await placardGame(row.gameId, now);
		if (game) {
			scorePush = await pushPlacardScore({
				game,
				homeScore: row.homeScore,
				awayScore: row.awayScore,
				userId: input.userId,
				now
			});
		}
	}
	return { ok: true, row, scorePush };
}

/** The screens a user is controlling, most recently used first. */
export async function controlledPlacards(userId: number): Promise<PlacardRow[]> {
	return db
		.select()
		.from(placards)
		.where(and(eq(placards.controllerUserId, userId), eq(placards.scene, 'match')))
		.orderBy(desc(placards.lastActionAt), desc(placards.id));
}

/** Whether `code` is on a screen waiting to be paired right now. */
export async function isPairingCodeLive(code: string, now = new Date()): Promise<boolean> {
	const [row] = await db
		.select({ expiresAt: placards.pairingCodeExpiresAt })
		.from(placards)
		.where(and(eq(placards.pairingCode, code), eq(placards.scene, 'pairing')))
		.limit(1);
	return Boolean(row?.expiresAt && row.expiresAt > now);
}
