import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '#lib/server/auth/session.ts';
import { userHasPassword } from '#lib/server/auth/profile.ts';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		return { hasPassword: await userHasPassword(locals.user.id) };
	}
	return { hasPassword: false };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		throw redirect(303, '/conta');
	}
};
