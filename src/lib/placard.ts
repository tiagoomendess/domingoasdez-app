/**
 * Pure stadium screen ("placard") logic shared by the server and the pages: the state a screen
 * shows, the controller's actions, and the clock. Ports the button logic of the old
 * react-scoreboard `ScoreBoardAdmin.tsx`, with the clock kept in **server** time: the old one
 * stamped the phone's `Date.now()` and the TV subtracted its own clock, so the two drifted apart.
 */

export const PLACARD_SCENES = ['pairing', 'match'] as const;
/**
 * What the screen shows underneath. Something shown for a while on top of the match (an ad break,
 * later substitutions and messages) is an overlay instead (`PlacardOverlay`).
 */
export type PlacardScene = (typeof PLACARD_SCENES)[number];

export const PLACARD_PERIODS = ['first_half', 'half_time', 'second_half'] as const;
export type PlacardPeriod = (typeof PLACARD_PERIODS)[number];

/** Laravel's `scoreboard-updated` rule: scores are 0–99. */
export const MAX_SCORE = 99;
export const MINUTE_MS = 60_000;
export const HALF_MS = 45 * MINUTE_MS;

export type PlacardClock = {
	/** Time counted until the last pause. */
	elapsedMs: number;
	/** Server epoch ms when the clock last started; null while paused. */
	runningSince: number | null;
	period: PlacardPeriod;
};

export type PlacardMatchState = {
	homeScore: number;
	awayScore: number;
	clock: PlacardClock;
};

export type PlacardSide = 'home' | 'away';

/** What a controller can do to a match. Add new actions here, then in `applyAction`. */
export type PlacardMatchAction =
	| { type: 'score'; side: PlacardSide; delta: 1 | -1 }
	| { type: 'clock_toggle' }
	| { type: 'clock_adjust'; deltaMs: number }
	| { type: 'clock_reset' }
	| { type: 'half_time' };

/**
 * Actions the server handles itself, because they need more than the match state: `end` takes
 * the screen off the game (back to pairing), `show_ad` starts an ad break with one of the home
 * club's ads. Future overlays (substitution, message) get their action here.
 */
export type PlacardServerAction =
	| { type: 'end' }
	| { type: 'show_ad'; adId: number }
	| { type: 'show_substitution'; side: PlacardSide; outPlayerId: number; inPlayerId: number }
	| { type: 'show_message'; text: string };

export type PlacardAction = PlacardMatchAction | PlacardServerAction;

const SERVER_ACTIONS: readonly string[] = ['end', 'show_ad', 'show_substitution', 'show_message'];

/** Server actions aren't guessed by the controller: it waits for the server's answer. */
export const isServerAction = (action: PlacardAction): action is PlacardServerAction =>
	SERVER_ACTIONS.includes(action.type);

export const initialClock = (): PlacardClock => ({
	elapsedMs: 0,
	runningSince: null,
	period: 'first_half'
});

/** The clock's time at `now` (server epoch ms). Never negative, even with a skewed `now`. */
export function elapsedMs(clock: PlacardClock, now: number): number {
	const running = clock.runningSince === null ? 0 : Math.max(0, now - clock.runningSince);
	return Math.max(0, clock.elapsedMs + running);
}

/** `MM:SS`. Minutes aren't capped (90:00 and beyond), like the old screen. */
export function formatClock(ms: number): string {
	const total = Math.floor(Math.max(0, ms) / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const clampScore = (value: number) => Math.min(MAX_SCORE, Math.max(0, value));

/** The clock paused at `now`, keeping the time it shows. */
function pause(clock: PlacardClock, now: number): PlacardClock {
	return { ...clock, elapsedMs: elapsedMs(clock, now), runningSince: null };
}

/**
 * The state after `action` at `now` (server epoch ms). Fixes two bugs of the old controller:
 * −1 min while paused could leave the start after the pause (a negative, garbled clock), and
 * −1 min under 1:00 while running reset and stopped the clock. Now the time is clamped at 0:00
 * and the clock keeps its running state.
 */
export function applyAction(
	state: PlacardMatchState,
	action: PlacardMatchAction,
	now: number
): PlacardMatchState {
	const { clock } = state;
	switch (action.type) {
		case 'score': {
			const key = action.side === 'home' ? 'homeScore' : 'awayScore';
			return { ...state, [key]: clampScore(state[key] + action.delta) };
		}
		case 'clock_toggle': {
			if (clock.runningSince !== null) return { ...state, clock: pause(clock, now) };
			// Starting after half-time is the second half, from 45:00.
			const period = clock.period === 'half_time' ? 'second_half' : clock.period;
			return { ...state, clock: { ...clock, period, runningSince: now } };
		}
		case 'clock_adjust': {
			const shown = elapsedMs(clock, now);
			const elapsed = Math.max(0, shown + action.deltaMs);
			const runningSince = clock.runningSince === null ? null : now;
			return { ...state, clock: { ...clock, elapsedMs: elapsed, runningSince } };
		}
		case 'clock_reset':
			return { ...state, clock: initialClock() };
		case 'half_time':
			// Only ends the first half; in the second half the button does nothing.
			if (clock.period !== 'first_half') return state;
			return { ...state, clock: { elapsedMs: HALF_MS, runningSince: null, period: 'half_time' } };
	}
}

const isId = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value > 0;

/** Validates an action sent by a controller (JSON body). */
export function parseAction(value: unknown): PlacardAction | null {
	if (!value || typeof value !== 'object') return null;
	const input = value as Record<string, unknown>;
	switch (input.type) {
		case 'score':
			if (
				(input.side === 'home' || input.side === 'away') &&
				(input.delta === 1 || input.delta === -1)
			) {
				return { type: 'score', side: input.side, delta: input.delta };
			}
			return null;
		case 'clock_adjust':
			if (input.deltaMs === MINUTE_MS || input.deltaMs === -MINUTE_MS) {
				return { type: 'clock_adjust', deltaMs: input.deltaMs };
			}
			return null;
		case 'show_ad':
			if (isId(input.adId)) return { type: 'show_ad', adId: input.adId };
			return null;
		case 'show_substitution':
			if (
				(input.side === 'home' || input.side === 'away') &&
				isId(input.outPlayerId) &&
				isId(input.inPlayerId) &&
				input.outPlayerId !== input.inPlayerId
			) {
				return {
					type: 'show_substitution',
					side: input.side,
					outPlayerId: input.outPlayerId,
					inPlayerId: input.inPlayerId
				};
			}
			return null;
		case 'show_message': {
			const text = normalizeMessage(input.text);
			return text ? { type: 'show_message', text } : null;
		}
		case 'clock_toggle':
		case 'clock_reset':
		case 'half_time':
		case 'end':
			return { type: input.type };
		default:
			return null;
	}
}

/** Team as the screen and the controller show it. */
export type PlacardTeam = { name: string; emblem: string };

/** Look of a screen: the default, or the home club's (`/clubes/{club}/placard`). */
export type PlacardTheme = {
	background: string;
	/** A 16:9 image covering the screen, over `background`; null for none. */
	backgroundImage: string | null;
	foreground: string;
	muted: string;
	accent: string;
	showNames: boolean;
};

// ---------------------------------------------------------------------------------------------
// Overlays: shown on top of the match for a while, then gone on their own.

/**
 * An overlay as the screens receive it, only while it lasts (`endsAt` in server ms). Each `type`
 * has its own fields and its own component in the TV's overlay registry; a substitution or a
 * message is one more member here.
 */
export type PlacardOverlay =
	| {
			type: 'ad';
			startedAt: number;
			endsAt: number;
			ad: { id: number; image: string };
	  }
	| {
			type: 'substitution';
			startedAt: number;
			endsAt: number;
			side: PlacardSide;
			team: PlacardTeam;
			out: PlacardSubPlayer;
			in: PlacardSubPlayer;
	  }
	| {
			type: 'message';
			startedAt: number;
			endsAt: number;
			text: string;
	  };

/** Longest message for the screen: what still reads from the stands in large type. */
export const MESSAGE_MAX_LENGTH = 120;
/** How long a message stays on the screen. */
export const MESSAGE_MS = 15_000;

/** Characters as people count them (an emoji or an accented letter is one). */
export const messageLength = (text: string) => [...text].length;

/**
 * A message as the screen shows it: trimmed, line breaks and runs of spaces turned into single
 * spaces (it's laid out by the screen), without control characters. Null when empty or longer
 * than `MESSAGE_MAX_LENGTH`.
 */
export function normalizeMessage(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text && messageLength(text) <= MESSAGE_MAX_LENGTH ? text : null;
}

/** A player in a substitution: `picture` is null for minors (no photos of minors in public). */
export type PlacardSubPlayer = { id: number; name: string; picture: string | null };

/** How long a substitution stays on the screen. */
export const SUBSTITUTION_MS = 10_000;

export type PlacardOverlayType = PlacardOverlay['type'];

/** Ad spots per club. */
export const MAX_ADS = 5;
export const AD_MIN_SECONDS = 1;
export const AD_MAX_SECONDS = 15;
export const AD_DEFAULT_SECONDS = 10;
/** One ad break per screen every 2 minutes, counted from the start of the previous one. */
export const AD_COOLDOWN_MS = 2 * MINUTE_MS;
/** Ads are stored as uploaded (GIFs stay animated), so they're capped instead of compressed. */
export const AD_MAX_BYTES = 1024 * 1024;

export const isAdDuration = (value: number) =>
	Number.isInteger(value) && value >= AD_MIN_SECONDS && value <= AD_MAX_SECONDS;

/** The ad after `id` in position order, wrapping around; the first one when `id` isn't there. */
export function nextAdAfter<Ad extends { id: number }>(
	ads: readonly Ad[],
	id: number | null
): Ad | null {
	if (ads.length === 0) return null;
	const index = ads.findIndex((ad) => ad.id === id);
	return ads[(index + 1) % ads.length] ?? ads[0];
}

/** When the next ad break may start (server ms). */
export const adAvailableAt = (lastAdAt: number | null) =>
	lastAdAt === null ? 0 : lastAdAt + AD_COOLDOWN_MS;

/** An ad spot as the controller lists it. */
export type PlacardAdSpot = { id: number; image: string; durationSeconds: number };

/** Ad image formats, told by their first bytes (not by the name or the browser's type). */
const IMAGE_SIGNATURES: { type: string; extension: string; test: (b: Uint8Array) => boolean }[] = [
	{
		type: 'image/png',
		extension: 'png',
		test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
	},
	{
		type: 'image/jpeg',
		extension: 'jpg',
		test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
	},
	{
		type: 'image/gif',
		extension: 'gif',
		test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
	},
	{
		type: 'image/webp',
		extension: 'webp',
		test: (b) =>
			b[0] === 0x52 &&
			b[1] === 0x49 &&
			b[2] === 0x46 &&
			b[3] === 0x46 &&
			b[8] === 0x57 &&
			b[9] === 0x45 &&
			b[10] === 0x42 &&
			b[11] === 0x50
	}
];

export function sniffImage(bytes: Uint8Array): { type: string; extension: string } | null {
	if (bytes.length < 12) return null;
	const match = IMAGE_SIGNATURES.find((signature) => signature.test(bytes));
	return match ? { type: match.type, extension: match.extension } : null;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** A `#rrggbb` colour from a form, lower-cased; null when empty or invalid. */
export function parseHexColor(value: unknown): string | null {
	return typeof value === 'string' && HEX_COLOR.test(value.trim())
		? value.trim().toLowerCase()
		: null;
}

/** What the TV (`/api/placard/estado`) and the controller (`/api/placard/{id}`) receive. */
export type PlacardPublicState = {
	id: number;
	version: number;
	/** Server epoch ms when the response was built: the clients' clock reference. */
	serverNow: number;
	scene: PlacardScene;
	/** Only on the TV: the code, the page it opens and that page as a QR code (SVG). */
	pairing: { code: string; expiresAt: number; url: string; qrSvg: string } | null;
	match: {
		gameId: number;
		home: PlacardTeam;
		away: PlacardTeam;
		homeScore: number;
		awayScore: number;
		clock: PlacardClock;
		/** Whether score changes reach the game (`games.scoreboard_updates`). */
		scoreboardUpdates: boolean;
	} | null;
	/** What's on top of the match right now, if anything (never an expired one). */
	overlay: PlacardOverlay | null;
	theme: PlacardTheme;
	/** Only for the controller: what its buttons need beyond the screen itself. */
	controls: {
		/** The home club's ad spots, in rotation order. */
		ads: PlacardAdSpot[];
		/** The ad preselected for the next break (rotates after each one). */
		nextAdId: number | null;
		/** When the next ad break may start (server ms; 0 = now). */
		adAvailableAt: number;
	} | null;
};

/**
 * What a score change did to the game (see `pushPlacardScore`):
 * - `not_live`: the game hasn't started or is finished; nothing is stored
 * - `not_allowed`: reported, but the game doesn't take scores from the placard
 *   (`games.scoreboard_updates` off)
 * - `unchanged`: reported; the game already had that score
 * - `updated`: reported and the game's score set
 */
export type ScorePushResult = 'not_live' | 'not_allowed' | 'unchanged' | 'updated';

/** The short answer to a poll whose version hasn't changed. */
export type PlacardUnchanged = { version: number; serverNow: number; unchanged: true };

/** Pairing codes: no 0/O, 1/I/L, so they're easy to read off a TV and type. */
export const PAIRING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const PAIRING_CODE_LENGTH = 6;

/** A typed code, normalised (spaces and dashes dropped, upper case); null if it can't be one. */
export function normalizePairingCode(value: string): string | null {
	const code = value.replace(/[\s-]/g, '').toUpperCase();
	if (code.length !== PAIRING_CODE_LENGTH) return null;
	for (const char of code) if (!PAIRING_ALPHABET.includes(char)) return null;
	return code;
}

/** `ABC123` → `ABC 123`, how the TV prints it. */
export const spacedCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
