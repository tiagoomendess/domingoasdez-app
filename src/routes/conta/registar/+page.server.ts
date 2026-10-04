import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { registerAccount } from '#lib/server/auth/register.ts';
import { captchaSiteKey } from '#lib/server/captcha.ts';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/conta');

	return {
		recaptchaSiteKey: captchaSiteKey()
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress, url }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '');
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const passwordConfirmation = String(form.get('password_confirmation') ?? '');
		const terms = form.get('terms') === 'on';
		const rgpd = form.get('rgpd') === 'on';
		const recaptchaToken = String(form.get('g-recaptcha-response') ?? '') || null;

		const result = await registerAccount({
			name,
			email,
			password,
			passwordConfirmation,
			terms,
			rgpd,
			recaptchaToken,
			ip: getClientAddress(),
			origin: url.origin
		});

		if (!result.ok) {
			return fail(400, { name, email, terms, rgpd, errors: result.errors });
		}

		throw redirect(303, `/conta/registar/verificar/${encodeURIComponent(result.email)}`);
	}
};
