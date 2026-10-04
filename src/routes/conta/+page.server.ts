import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { clearSessionCookie } from '#lib/server/auth/session.ts';

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		throw redirect(303, '/conta');
	}
};
