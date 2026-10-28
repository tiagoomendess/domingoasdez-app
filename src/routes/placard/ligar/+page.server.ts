import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { normalizePairingCode } from '#lib/placard.ts';
import { signInUrl } from '#lib/server/placard/access.ts';
import type { Actions, PageServerLoad } from './$types';

/** Typing the code shown on the TV, for phones that can't scan its QR. */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, signInUrl('/placard/ligar'));
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, signInUrl('/placard/ligar'));
		const typed = String((await request.formData()).get('code') ?? '');
		const code = normalizePairingCode(typed);
		if (!code) return fail(400, { code: typed, error: m.placard_pair_code_invalid() });
		redirect(303, `/placard/ligar/${code}`);
	}
};
