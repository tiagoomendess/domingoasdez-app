import { isHttpError, isRedirect, type RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { LogLevel, Logger } from './logger.ts';
import { requestContext } from './request-context.ts';

/** Path params kept out of the logs (email verification links): the route id is logged instead. */
const SECRET_PARAMS = ['email', 'token'];

export type RequestSummary = {
	requestId: string;
	method: string;
	/** Without the query string (searches, OAuth codes). */
	path: string;
	route: string | null;
	status: number;
	durationMs: number;
	userId?: number;
	/** The visitor's IP (`CF-Connecting-IP` behind Cloudflare, see `ADDRESS_HEADER`). */
	ip?: string;
	userAgent?: string;
};

/** The path to log: the route id when the path carries an email or a token. */
export function loggedPath(event: Pick<RequestEvent, 'url' | 'route' | 'params'>): string {
	const secret = SECRET_PARAMS.some((name) => name in event.params);
	return secret && event.route.id ? event.route.id : event.url.pathname;
}

/**
 * The client's IP, or nothing when it can't be read: adapter-node throws when `ADDRESS_HEADER` is
 * set and the header is missing (requests that skip Cloudflare, such as the local uptime checks).
 */
export function clientAddress(event: Pick<RequestEvent, 'getClientAddress'>): string | undefined {
	try {
		return event.getClientAddress();
	} catch {
		return undefined;
	}
}

/** Level and line of a finished request: errors for 5xx, the uptime checks only at debug level. */
export function requestEntry(request: RequestSummary): {
	level: LogLevel;
	message: string;
	fields: RequestSummary;
} {
	const { method, path, route, status, durationMs } = request;
	const level = status >= 500 ? 'error' : route === '/healthz' ? 'debug' : 'info';
	return { level, message: `${method} ${path} ${status} ${durationMs}ms`, fields: request };
}

/**
 * First `handle`: one line per request with its id, which `handleError` reuses, and the request
 * context for the other entries. Static files (`/_app/immutable/…`) are served by adapter-node
 * before the hooks and not logged.
 */
export function logRequests(log: Logger): Handle {
	return ({ event, resolve }) => {
		event.locals.requestId = crypto.randomUUID();
		return requestContext.run(event.locals, async () => {
			const started = performance.now();
			// SvelteKit answers 500 when `handle` or `resolve` throws something else.
			let status = 500;
			try {
				const response = await resolve(event);
				status = response.status;
				return response;
			} catch (error) {
				if (isRedirect(error) || isHttpError(error)) status = error.status;
				throw error;
			} finally {
				const { level, message, fields } = requestEntry({
					requestId: event.locals.requestId,
					method: event.request.method,
					path: loggedPath(event),
					route: event.route.id,
					status,
					durationMs: Math.round(performance.now() - started),
					userId: event.locals.user?.id,
					ip: clientAddress(event),
					userAgent: event.request.headers.get('user-agent') ?? undefined
				});
				log[level](message, fields);
			}
		});
	};
}
