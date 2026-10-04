import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enabledSocialProviders } from '#lib/server/auth/social.ts';
import {
	googleAuthorizationUrl,
	googleRedirectUri,
	isGoogleConfigured
} from '#lib/server/auth/google.ts';

const STATE_COOKIE = 'social_login_state';

export const GET: RequestHandler = async ({ params, cookies, url, locals }) => {
	if (locals.user) throw redirect(303, '/conta');

	const provider = params.provider;
	if (!enabledSocialProviders().includes(provider as 'google')) {
		throw redirect(303, '/conta/entrar?error=unconfigured');
	}

	if (provider !== 'google' || !isGoogleConfigured()) {
		throw redirect(303, '/conta/entrar?error=unconfigured');
	}

	const state = crypto.randomUUID();
	cookies.set(STATE_COOKIE, `google:${state}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 600
	});

	const redirectUri = googleRedirectUri(url.origin);
	throw redirect(302, googleAuthorizationUrl(state, redirectUri));
};
