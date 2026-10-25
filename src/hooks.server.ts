import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_ADSENSE_CLIENT, PUBLIC_GA_MEASUREMENT_ID } from '$app/env/public';
import { ADSENSE_ENABLED } from '$app/env/private';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { SESSION_COOKIE, readSessionUserId } from '#lib/server/auth/session.ts';
import { adsDisabled } from '#lib/ads.ts';
import { getUserPermissionNames } from '#lib/server/auth/permissions.ts';
import { getAuthUserById } from '#lib/server/auth/users.ts';
import { logger } from '#lib/server/log.ts';
import { assertSupportedNodeVersion } from '#lib/server/node-version.ts';
import { loggedPath, logRequests } from '#lib/server/request-log.ts';

// Runs once before the server accepts requests; on an old Node.js the process exits instead.
export const init: ServerInit = () => {
	assertSupportedNodeVersion();
};

const authHandle: Handle = async ({ event, resolve }) => {
	const userId = await readSessionUserId(event.cookies.get(SESSION_COOKIE));
	event.locals.user = userId ? await getAuthUserById(userId) : null;
	// ADSENSE_ENABLED=false turns ads off site-wide; otherwise the disable_ads permission does it per user.
	event.locals.adsDisabled = !ADSENSE_ENABLED
		? true
		: event.locals.user
			? adsDisabled(await getUserPermissionNames(event.locals.user.id))
			: false;

	// Funding Choices still loads so Analytics gets a consent update. Only the ad script is gated.
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replaceAll('%ADSENSE_ENABLED%', event.locals.adsDisabled ? '' : '1')
	});
};

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%lang%', locale)
						.replace('%theme-class%', event.cookies.get('theme') === 'dark' ? 'dark' : '')
						.replace('%PUBLIC_GA_MEASUREMENT_ID%', PUBLIC_GA_MEASUREMENT_ID)
						.replace('%PUBLIC_ADSENSE_CLIENT%', PUBLIC_ADSENSE_CLIENT)
			}
		)
	);

export const handle = sequence(logRequests(logger), paraglideHandle, authHandle);

export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind !== 'unknown') return;
	logger.error(
		`${event.request.method} ${loggedPath(event)} failed`,
		{ requestId: event.locals.requestId, route: event.route.id },
		error
	);
};
