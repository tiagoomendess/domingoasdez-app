import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_ADSENSE_CLIENT, PUBLIC_GA_MEASUREMENT_ID } from '$app/env/public';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { SESSION_COOKIE, readSessionUserId } from '#lib/server/auth/session.ts';
import { adsDisabled } from '#lib/ads.ts';
import { getUserPermissionNames } from '#lib/server/auth/permissions.ts';
import { getAuthUserById } from '#lib/server/auth/users.ts';

const authHandle: Handle = async ({ event, resolve }) => {
	const userId = await readSessionUserId(event.cookies.get(SESSION_COOKIE));
	event.locals.user = userId ? await getAuthUserById(userId) : null;
	event.locals.adsDisabled = event.locals.user
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

export const handle = sequence(paraglideHandle, authHandle);
