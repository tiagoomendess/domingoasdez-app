import { fail, redirect } from '@sveltejs/kit';
import {
	MAX_UPLOAD_BYTES,
	removeProfilePicture,
	setProfilePicture
} from '#lib/server/auth/profile-picture.ts';
import { m } from '#lib/messages.ts';
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

const pictureErrors = {
	invalid: () => m.account_photo_error_invalid(),
	too_large: () => m.account_photo_error_too_large(),
	unavailable: () => m.account_photo_error_unavailable(),
	failed: () => m.account_photo_error_failed()
};

export const actions: Actions = {
	picture: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/conta/entrar?redirectTo=%2Fconta');
		const photo = (await request.formData()).get('photo');
		if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_UPLOAD_BYTES) {
			return fail(400, { pictureError: pictureErrors.invalid() });
		}
		const result = await setProfilePicture(
			locals.user.id,
			new Uint8Array(await photo.arrayBuffer())
		);
		if (!result.ok) return fail(400, { pictureError: pictureErrors[result.reason]() });
		return { pictureUpdated: true };
	},
	removePicture: async ({ locals }) => {
		if (!locals.user) throw redirect(303, '/conta/entrar?redirectTo=%2Fconta');
		const result = await removeProfilePicture(locals.user.id);
		if (!result.ok) return fail(400, { pictureError: pictureErrors[result.reason]() });
		return { pictureUpdated: true };
	},
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		throw redirect(303, '/conta');
	}
};
