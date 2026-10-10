import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { checkPin, findCommentPin, setPinCookie } from '#lib/server/flash-interview.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const uuid = params.uuid;
	const expected = await findCommentPin(uuid);
	if (!expected) throw error(404, m.flash_interview_not_found());

	return {
		uuid,
		// `?error=<attempted-pin>` (redirects) or null; POST failures arrive via `form`.
		attemptedPin: url.searchParams.get('error'),
		seo: {
			title: m.flash_interview_pin_title(),
			description: m.flash_interview_pin_meta_description()
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const uuid = params.uuid;
		const form = await request.formData();
		const pin = String(form.get('pin') ?? '').trim();

		const expected = await findCommentPin(uuid);
		if (!expected) throw error(404, m.flash_interview_not_found());
		if (!pin || !checkPin(pin, expected)) {
			return fail(400, { attemptedPin: pin || null });
		}

		setPinCookie(cookies, uuid, pin);
		throw redirect(303, `/flash-interview/${uuid}`);
	}
};
