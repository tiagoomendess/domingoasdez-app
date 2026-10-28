/**
 * Pure stadium screen ("placard") logic shared by the server and the pages: the state a screen
 * shows, the controller's actions, and the clock. Ports the button logic of the old
 * react-scoreboard `ScoreBoardAdmin.tsx`, with the clock kept in **server** time: the old one
 * stamped the phone's `Date.now()` and the TV subtracted its own clock, so the two drifted apart.
 */

export const PLACARD_SCENES = ['pairing', 'match'] as const;
/** What the screen shows. New scenes (ad breaks, messages) are added here and in the registry. */
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

/** `end` takes the screen off the game (back to pairing); it's handled by the server. */
export type PlacardAction = PlacardMatchAction | { type: 'end' };

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

/** Look of a screen. The default for now; later each home club gets its own. */
export type PlacardTheme = {
	background: string;
	foreground: string;
	muted: string;
	accent: string;
	showNames: boolean;
};

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
	theme: PlacardTheme;
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
