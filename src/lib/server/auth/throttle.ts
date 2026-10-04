/** Tiny process-local login throttle (legacy-style lockout without Redis). */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

function prune(key: string, now: number) {
	const recent = (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
	if (recent.length === 0) attempts.delete(key);
	else attempts.set(key, recent);
	return recent;
}

export function isLoginThrottled(key: string) {
	return prune(key, Date.now()).length >= MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string) {
	const now = Date.now();
	const recent = prune(key, now);
	recent.push(now);
	attempts.set(key, recent);
}

export function clearLoginFailures(key: string) {
	attempts.delete(key);
}
