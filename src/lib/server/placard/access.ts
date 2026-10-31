import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { AuthUser } from '#lib/auth/user.ts';
import { SCORE_REPORT_UUID_COOKIE } from '#lib/score-reports.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { hasActiveScoreReportBan } from '#lib/server/score-reports.ts';
import type { PlacardRow } from './device.ts';

/**
 * Who may control a screen: the user who paired it, or anyone with `score_update` (the admins
 * who fix results), so a screen whose controller lost their phone can still be run.
 */
export async function placardControlCheck(userId: number): Promise<(row: PlacardRow) => boolean> {
	const anyScreen = hasPermission(await getUserPermissionNames(userId), 'score_update');
	return (row) => anyScreen || row.controllerUserId === userId;
}

/**
 * A fixed-window limit per key, process-local like the legacy API's throttle (PM2 runs one fork).
 * `allowed` only checks; `hit` counts one use. Count after the work succeeded when failures
 * shouldn't use up the limit (a screen whose creation failed retries every second).
 */
export function createRateLimit(max: number, windowMs: number) {
	const hits = new Map<string, { count: number; resetAt: number }>();
	const entryOf = (key: string, now: number) => {
		if (hits.size > 10_000) {
			for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
		}
		let entry = hits.get(key);
		if (!entry || entry.resetAt <= now) {
			entry = { count: 0, resetAt: now + windowMs };
			hits.set(key, entry);
		}
		return entry;
	};
	return {
		allowed: (key: string, now = Date.now()) => entryOf(key, now).count < max,
		hit: (key: string, now = Date.now()) => {
			entryOf(key, now).count++;
		}
	};
}

/** The sign-in page, coming back to `path` afterwards. */
export const signInUrl = (path: string) => `/conta/entrar?redirectTo=${encodeURIComponent(path)}`;

type ControllerEvent = Pick<RequestEvent, 'locals' | 'cookies' | 'request' | 'getClientAddress'>;

/**
 * Whether the signed-in user is barred from controlling screens: an active score-report ban on
 * their account, this browser's uuid, one of their uuids or their IP. The controller pushes scores
 * to the game (and writes score reports), so a banned reporter could use it to send wrong scores
 * again. The TV side stays open.
 */
export async function placardControlBanned(event: ControllerEvent, user: AuthUser) {
	let ipAddress: string | null = null;
	try {
		ipAddress = event.getClientAddress();
	} catch {
		// No address (prerender, tests): the account and uuids still apply.
	}
	return hasActiveScoreReportBan({
		userId: user.id,
		uuid: event.cookies.get(SCORE_REPORT_UUID_COOKIE) ?? null,
		ipAddress,
		userAgent: event.request.headers.get('user-agent')
	});
}

/**
 * The guard of every controller page: signed in (else the sign-in page, back to `path`) and not
 * banned from score reports (else a 403). Returns the user.
 */
export async function requirePlacardController(
	event: ControllerEvent,
	path: string
): Promise<AuthUser> {
	const user = event.locals.user;
	if (!user) redirect(303, signInUrl(path));
	if (await placardControlBanned(event, user)) error(403, 'Placard control blocked');
	return user;
}
