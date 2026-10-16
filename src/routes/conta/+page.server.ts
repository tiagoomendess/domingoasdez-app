import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '#lib/server/auth/session.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { adminUrl } from '#lib/server/admin.ts';
import { userHasPassword } from '#lib/server/auth/profile.ts';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		const [hasPassword, perms] = await Promise.all([
			userHasPassword(locals.user.id),
			getUserPermissionNames(locals.user.id)
		]);
		return {
			hasPassword,
			backofficeHref: hasPermission(perms, 'dashboard') ? adminUrl('/') : null
		};
	}
	return { hasPassword: false, backofficeHref: null };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		throw redirect(303, '/conta');
	}
};
