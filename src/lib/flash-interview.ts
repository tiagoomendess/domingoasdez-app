/** Pure flash-interview helpers — ported from Laravel's GameCommentsController. */

export const FLASH_COMMENT_MAX = 1000;
export const FLASH_EMAIL_MIN = 10;
export const FLASH_EMAIL_MAX = 64;
export const FLASH_PIN_COOKIE_PREFIX = 'flash_pin_';
/** PIN cookie lifespan (httpOnly, scoped to the interview path). */
export const FLASH_PIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
export const FLASH_TOAST_COOKIE = 'flash_interview_flash';

export type FlashToastKind = 'saved' | 'deadline' | 'invalid' | 'notif_saved' | 'notif_email';

/** Cookie name holding the verified PIN for one interview uuid. */
export function flashPinCookieName(uuid: string): string {
	return `${FLASH_PIN_COOKIE_PREFIX}${uuid}`;
}

/** Strict PIN check (Laravel `$pin !== $gameComment->pin`, trimmed). */
export function isCorrectPin(provided: unknown, expected: string): boolean {
	return String(provided ?? '').trim() === expected;
}

/** Laravel `Str::limit(1000)` + `strip_tags`: truncate, then drop HTML tags. */
export function sanitizeComment(input: unknown): string {
	const text = String(input ?? '');
	const limited = text.length <= FLASH_COMMENT_MAX ? text : text.slice(0, FLASH_COMMENT_MAX);
	return limited.replace(/<[^>]*>/g, '');
}

/** Validate the nullable comment (`nullable|string|max:1000`). */
export function validateComment(input: unknown): { ok: true } | { ok: false } {
	if (input == null || input === '') return { ok: true };
	if (typeof input !== 'string') return { ok: false };
	return input.length <= FLASH_COMMENT_MAX ? { ok: true } : { ok: false };
}

export type ParsedGoalPick =
	{ kind: 'player'; playerId: number } | { kind: 'own_goal' } | { kind: 'missing' };

/**
 * Port the `players[]` select values: `> 0` player id, `-1` opponent own
 * goal, anything else (incl. `0`) missing player.
 */
export function parseGoalPick(value: unknown): ParsedGoalPick {
	const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
	if (Number.isInteger(n) && n > 0) return { kind: 'player', playerId: n };
	if (n === -1) return { kind: 'own_goal' };
	return { kind: 'missing' };
}

/** Port the `minutes[]` rule: positive integers only, else null. */
export function parseMinute(value: unknown): number | null {
	const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
	if (Number.isInteger(n) && n > 0) return n;
	return null;
}

/** Laravel `required|email|min:10|max:64` for the contact email. */
export function isValidContactEmail(input: unknown): boolean {
	const email = String(input ?? '').trim();
	if (email.length < FLASH_EMAIL_MIN || email.length > FLASH_EMAIL_MAX) return false;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Checkbox semantics (`$request->filled(...)`): present and non-empty. */
export function parseNotificationsEnabled(value: unknown): boolean {
	if (value == null) return false;
	if (value === true) return true;
	const text = String(value).trim().toLowerCase();
	return text !== '' && text !== 'false' && text !== '0' && text !== 'off';
}
