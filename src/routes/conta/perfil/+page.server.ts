import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getProfileDetails, updateProfile } from '#lib/server/auth/profile.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent('/conta/perfil')}`);
	}

	const profile = await getProfileDetails(locals.user.id);
	if (!profile) throw error(404, 'Profile not found');

	return {
		profile,
		saved: url.searchParams.get('saved') === '1'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent('/conta/perfil')}`);
		}

		const form = await request.formData();
		const phone = String(form.get('phone') ?? '');
		const bio = String(form.get('bio') ?? '');

		const result = await updateProfile(locals.user.id, { phone, bio });
		if (!result.ok) {
			return fail(400, { phone, bio, errors: result.errors });
		}

		throw redirect(303, '/conta/perfil?saved=1');
	}
};
