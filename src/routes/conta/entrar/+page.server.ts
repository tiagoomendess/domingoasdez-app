import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { enabledSocialProviders } from '#lib/server/auth/social.ts';
import { attemptPasswordLogin } from '#lib/server/auth/users.ts';
import { setSessionCookie } from '#lib/server/auth/session.ts';
import {
	clearLoginFailures,
	isLoginThrottled,
	recordLoginFailure
} from '#lib/server/auth/throttle.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, '/conta');

	const error = url.searchParams.get('error');
	return {
		socialProviders: enabledSocialProviders(),
		socialError: error,
		verified: url.searchParams.get('verified') === '1'
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const remember = form.get('remember') === 'on';
		const redirectTo = String(form.get('redirectTo') ?? '/conta');

		const throttleKey = `${getClientAddress()}:${email.trim().toLowerCase()}`;
		if (isLoginThrottled(throttleKey)) {
			return fail(429, { email, remember, error: 'throttled' as const });
		}

		const result = await attemptPasswordLogin(email, password);
		if (!result.ok) {
			recordLoginFailure(throttleKey);
			return fail(400, { email, remember, error: 'invalid' as const });
		}

		clearLoginFailures(throttleKey);
		await setSessionCookie(cookies, result.user.id, remember);

		const safeRedirect =
			redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/conta';
		const next = url.searchParams.get('redirectTo');
		const destination =
			next && next.startsWith('/') && !next.startsWith('//') ? next : safeRedirect;
		throw redirect(303, destination);
	}
};
