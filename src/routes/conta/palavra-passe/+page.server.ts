import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { changePassword, userHasPassword } from '#lib/server/auth/profile.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent('/conta/palavra-passe')}`);
	}

	const hasPassword = await userHasPassword(locals.user.id);
	if (!hasPassword) throw redirect(303, '/conta');

	return {
		changed: url.searchParams.get('changed') === '1'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(
				303,
				`/conta/entrar?redirectTo=${encodeURIComponent('/conta/palavra-passe')}`
			);
		}

		const form = await request.formData();
		const currentPassword = String(form.get('password_atual') ?? '');
		const newPassword = String(form.get('nova_password') ?? '');
		const newPasswordConfirmation = String(form.get('nova_password_confirmation') ?? '');

		const result = await changePassword(locals.user.id, {
			currentPassword,
			newPassword,
			newPasswordConfirmation
		});

		if (!result.ok) {
			return fail(400, { errors: result.errors });
		}

		throw redirect(303, '/conta/palavra-passe?changed=1');
	}
};
