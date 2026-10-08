import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_ADSENSE_CLIENT, PUBLIC_GA_MEASUREMENT_ID } from '$app/env/public';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { SESSION_COOKIE, readSessionUserId } from '#lib/server/auth/session.ts';
import { getAuthUserById } from '#lib/server/auth/users.ts';

const authHandle: Handle = async ({ event, resolve }) => {
	const userId = await readSessionUserId(event.cookies.get(SESSION_COOKIE));
	event.locals.user = userId ? await getAuthUserById(userId) : null;

	if (event.locals.user) {
		const perms = await getUserPermissionNames(event.locals.user.id);
		event.locals.showAds = !hasPermission(perms, 'disable_ads');
	} else {
		event.locals.showAds = true;
	}

	return resolve(event);
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
						.replace(
							'%PUBLIC_ADSENSE_CLIENT%',
							event.locals.showAds ? PUBLIC_ADSENSE_CLIENT : ''
						)
			}
		)
	);

// Auth first so `locals.showAds` is set before the HTML transform blanks the AdSense client.
export const handle = sequence(authHandle, paraglideHandle);
