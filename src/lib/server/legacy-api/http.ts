/**
 * Shared plumbing for the legacy `/api/*` endpoints (routes/api.php in the Laravel app).
 *
 * - `legacyApi()` wraps a handler with the `api` middleware group: `throttle:240,1` per client
 *   IP, and JSON bodies for errors where Laravel rendered its HTML error pages.
 * - `requireAccessToken()` ports the AuthenticateAccessToken middleware.
 */
import { randomBytes } from 'node:crypto';
import { isHttpError, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { audit, variables } from '#lib/server/db/schema.ts';
import { phpJsonString, strLimit } from './php.ts';

export function legacyJson(body: unknown, status = 200): Response {
	return Response.json(body, { status });
}

/** Laravel's 404 (`findOrFail`, route binding, `abort(404)`), as JSON instead of the HTML page. */
export function notFound(): Response {
	return legacyJson({ message: 'Not Found' }, 404);
}

/** `variables.value` by name, or null (ports Variable::getValue). */
export async function getVariable(name: string): Promise<string | null> {
	const [row] = await db
		.select({ value: variables.value })
		.from(variables)
		.where(eq(variables.name, name))
		.limit(1);
	return row?.value ?? null;
}

// ---------------------------------------------------------------------------------------------
// throttle:240,1 — a fixed one-minute window per client IP, process-local (PM2 runs one fork).

const THROTTLE_MAX = 240;
const THROTTLE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

export type ThrottleResult = { allowed: boolean; remaining: number; retryAfter: number };

export function hitThrottle(key: string, now = Date.now()): ThrottleResult {
	if (hits.size > 10_000) {
		for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
	}

	let entry = hits.get(key);
	if (!entry || entry.resetAt <= now) {
		entry = { count: 0, resetAt: now + THROTTLE_WINDOW_MS };
		hits.set(key, entry);
	}

	const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
	if (entry.count >= THROTTLE_MAX) return { allowed: false, remaining: 0, retryAfter };

	entry.count++;
	return { allowed: true, remaining: THROTTLE_MAX - entry.count, retryAfter };
}

export function resetThrottle() {
	hits.clear();
}

function clientIp(event: RequestEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

export function legacyApi(handler: RequestHandler): RequestHandler {
	return async (event) => {
		const limit = hitThrottle(clientIp(event));

		if (!limit.allowed) {
			const res = legacyJson({ message: 'Too Many Attempts.' }, 429);
			res.headers.set('X-RateLimit-Limit', String(THROTTLE_MAX));
			res.headers.set('X-RateLimit-Remaining', '0');
			res.headers.set('Retry-After', String(limit.retryAfter));
			res.headers.set(
				'X-RateLimit-Reset',
				String(Math.floor(Date.now() / 1000) + limit.retryAfter)
			);
			return res;
		}

		let res: Response;
		try {
			res = await handler(event);
		} catch (e) {
			if (isHttpError(e)) {
				res = legacyJson({ message: e.body.message }, e.status);
			} else {
				console.error(`[legacy-api] ${event.request.method} ${event.url.pathname}`, e);
				res = legacyJson({ message: 'Server Error' }, 500);
			}
		}

		res.headers.set('Cache-Control', 'no-cache, private');
		res.headers.set('X-RateLimit-Limit', String(THROTTLE_MAX));
		res.headers.set('X-RateLimit-Remaining', String(limit.remaining));
		return res;
	};
}

// ---------------------------------------------------------------------------------------------
// AuthenticateAccessToken

const TOKEN_TTL_MS = 120_000;
let cachedToken: { value: string; expiresAt: number } | null = null;

async function expectedToken(now = Date.now()): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

	let value = await getVariable('api_access_token');
	// No token configured: compare against a random one, so every request is refused.
	if (!value) value = randomBytes(24).toString('base64url').slice(0, 32);

	cachedToken = { value, expiresAt: now + TOKEN_TTL_MS };
	return value;
}

export function clearAccessTokenCache() {
	cachedToken = null;
}

/**
 * The token from an `Authorization` header, as the middleware read it: every `Bearer` and `\"`
 * removed, then trimmed. Null when the header is missing or falsy in PHP ("" or "0").
 */
export function parseAccessToken(header: string | null): string | null {
	if (header == null || header === '' || header === '0') return null;
	return header.replaceAll('Bearer', '').replaceAll('\\"', '').trim();
}

/**
 * `json_encode()` of the token as PHP received it. Header values reach Node as latin1, PHP saw
 * the raw bytes: bytes that aren't valid UTF-8 make json_encode fail, and Audit stored NULL.
 */
export function auditTokenValue(token: string): string | null {
	try {
		const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(token, 'latin1'));
		return strLimit(phpJsonString(utf8), 65531);
	} catch {
		return null;
	}
}

async function auditFailedLogin(event: RequestEvent, token: string) {
	try {
		const now = new Date();
		const { request, cookies } = event;
		await db.insert(audit).values({
			userId: null,
			action: 'login_failed',
			model: 'Variable',
			modelId: null,
			// Audit::add json-encoded the null old value into the string "null".
			oldValues: 'null',
			newValues: auditTokenValue(token),
			ipAddress: strLimit(clientIp(event), 45, ''),
			ipCountry: strLimit(request.headers.get('cf-ipcountry') ?? 'Unknown', 45, ''),
			userAgent: strLimit(request.headers.get('user-agent') ?? '', 255, ''),
			timezone: cookies.get('timezone') ? strLimit(cookies.get('timezone')!, 30, '') : null,
			language: cookies.get('lang') ? strLimit(cookies.get('lang')!, 30, '') : null,
			extraInfo: null,
			createdAt: now,
			updatedAt: now
		});
	} catch (e) {
		console.error('[legacy-api] Error adding audit', e);
	}
}

/** Null when the request carries the API access token, otherwise the 401 to return. */
export async function requireAccessToken(event: RequestEvent): Promise<Response | null> {
	const token = parseAccessToken(event.request.headers.get('authorization'));
	if (token === null) {
		return legacyJson({ success: false, message: 'No access token provided, access denied' }, 401);
	}

	if (token !== (await expectedToken())) {
		console.error('[legacy-api] Authentication via api access token failed');
		await auditFailedLogin(event, token);
		return legacyJson({ success: false, message: 'Invalid access token, access denied' }, 401);
	}

	return null;
}
