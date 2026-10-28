import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
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
