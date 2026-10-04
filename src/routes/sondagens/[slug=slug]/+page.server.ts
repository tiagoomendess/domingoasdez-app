import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { captchaSiteKey } from '#lib/server/captcha.ts';
import { loadPollPage, voteOnPoll } from '#lib/server/polls.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	const poll = await loadPollPage({
		slug: params.slug,
		user: locals.user,
		cookies,
		recaptchaSiteKey: captchaSiteKey()
	});
	if (!poll) error(404, m.poll_not_found());
	return { poll };
};

export const actions: Actions = {
	default: async ({ request, params, cookies, locals, getClientAddress }) => {
		const form = await request.formData();
		const answerId = Number.parseInt(String(form.get('answer') ?? ''), 10);
		let ip = '';
		try {
			ip = getClientAddress();
		} catch {
			ip = '';
		}

		const result = await voteOnPoll({
			slug: params.slug,
			answerId,
			user: locals.user,
			cookies,
			ip,
			recaptchaToken: String(form.get('g-recaptcha-response') ?? '') || null
		});

		const back = `/sondagens/${params.slug}`;
		if (result.ok) return redirect(303, back);

		switch (result.error) {
			case 'not_found':
				return fail(404, { error: result.error });
			case 'closed':
			case 'already':
				return redirect(303, back);
			default:
				return fail(400, {
					error: result.error,
					answerId: result.answerId
				});
		}
	}
};
