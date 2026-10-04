import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	fetchGoogleIdentity,
	googleRedirectUri,
	isGoogleConfigured,
	resolveExistingSocialUser
} from '#lib/server/auth/google.ts';
import { setSessionCookie } from '#lib/server/auth/session.ts';

const STATE_COOKIE = 'social_login_state';

export const GET: RequestHandler = async ({ params, cookies, url, locals }) => {
	if (locals.user) throw redirect(303, '/conta');

	const forget = () => cookies.delete(STATE_COOKIE, { path: '/' });

	if (params.provider !== 'google' || !isGoogleConfigured()) {
		forget();
		throw redirect(303, '/conta/entrar?error=unconfigured');
	}

	const given = url.searchParams.get('state') ?? '';
	const stored = cookies.get(STATE_COOKIE) ?? '';
	const expected = `google:${given}`;

	if (url.searchParams.has('error') || !given || stored !== expected) {
		forget();
		throw redirect(303, '/conta/entrar?error=state');
	}

	const code = url.searchParams.get('code') ?? '';
	if (!code) {
		forget();
		throw redirect(303, '/conta/entrar?error=error');
	}

	try {
		const identity = await fetchGoogleIdentity(code, googleRedirectUri(url.origin));
		const result = await resolveExistingSocialUser('google', identity);
		forget();

		if (!result.ok) {
			throw redirect(303, `/conta/entrar?error=${result.reason}`);
		}

		await setSessionCookie(cookies, result.user.id, true);
		throw redirect(303, '/conta');
	} catch (error) {
		forget();
		if (error && typeof error === 'object' && 'status' in error) throw error;
		throw redirect(303, '/conta/entrar?error=error');
	}
};
