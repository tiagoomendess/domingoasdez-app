import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import {
	checkPin,
	findCommentPin,
	loadFlashInterviewPage,
	readPinCookie,
	saveFlashInterview,
	setFlashToast,
	setPinCookie
} from '#lib/server/flash-interview.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, cookies }) => {
	const uuid = params.uuid;

	const exists = await findCommentPin(uuid);
	if (!exists) throw error(404, m.flash_interview_not_found());

	const queryPin = (url.searchParams.get('pin') ?? '').trim();

	if (queryPin) {
		if (!checkPin(queryPin, exists)) {
			throw redirect(303, `/flash-interview/${uuid}/pin?error=${encodeURIComponent(queryPin)}`);
		}
		setPinCookie(cookies, uuid, queryPin);
		throw redirect(303, `/flash-interview/${uuid}`);
	}

	const cookiePin = readPinCookie(cookies, uuid);
	if (!cookiePin) throw redirect(303, `/flash-interview/${uuid}/pin`);

	if (!checkPin(cookiePin, exists)) {
		throw redirect(303, `/flash-interview/${uuid}/pin`);
	}

	const page = await loadFlashInterviewPage({ uuid });
	if (!page) throw error(404, m.flash_interview_not_found());

	return {
		interview: page,
		seo: {
			title: m.flash_interview_title(),
			description: m.flash_interview_meta_description()
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const uuid = params.uuid;
		const form = await request.formData();
		const pin = String(form.get('pin') ?? '') || readPinCookie(cookies, uuid) || '';

		const result = await saveFlashInterview({
			uuid,
			pin,
			content: form.get('content'),
			playerValues: form.getAll('players[]'),
			minuteValues: form.getAll('minutes[]')
		});

		if (!result.ok) {
			if (result.error === 'not_found') throw error(404, m.flash_interview_not_found());
			if (result.error === 'bad_pin') {
				throw redirect(
					303,
					`/flash-interview/${uuid}/pin?error=${encodeURIComponent(pin.trim() || '????')}`
				);
			}
			if (result.error === 'closed') {
				setFlashToast(cookies, 'deadline');
				throw redirect(303, `/flash-interview/${uuid}`);
			}
			return fail(400, {
				error: result.error,
				content: String(form.get('content') ?? '')
			});
		}

		setPinCookie(cookies, uuid, pin.trim());
		setFlashToast(cookies, 'saved');
		throw redirect(303, `/flash-interview/${uuid}`);
	}
};
