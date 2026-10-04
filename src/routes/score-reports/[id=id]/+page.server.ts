import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { captchaSiteKey } from '#lib/server/captcha.ts';
import {
	ensureScoreReportUuid,
	loadScoreReportPage,
	setScoreReportFlash,
	submitScoreReport
} from '#lib/server/score-reports.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	url,
	cookies,
	locals,
	getClientAddress,
	request
}) => {
	const gameId = Number.parseInt(params.id, 10);
	if (!Number.isFinite(gameId)) error(404, m.game_not_found());

	const uuid = ensureScoreReportUuid(cookies);
	const page = await loadScoreReportPage({
		gameId,
		uuid,
		user: locals.user,
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent'),
		returnToRaw: url.searchParams.get('returnTo'),
		origin: url.origin,
		recaptchaSiteKey: captchaSiteKey()
	});

	if (!page) error(404, m.game_not_found());

	return {
		...page,
		seo: {
			title: m.score_report_title(),
			description: m.score_report_meta_description()
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, cookies, locals, getClientAddress, url }) => {
		const gameId = Number.parseInt(params.id, 10);
		if (!Number.isFinite(gameId)) {
			return fail(404, { error: 'not_found' as const });
		}

		const uuid = ensureScoreReportUuid(cookies);
		const form = await request.formData();

		const homeScore = Number.parseInt(String(form.get('home_score') ?? ''), 10);
		const awayScore = Number.parseInt(String(form.get('away_score') ?? ''), 10);
		const finished = form.get('finished') === 'true' || form.get('finished') === 'on';

		const result = await submitScoreReport({
			gameId,
			homeScore,
			awayScore,
			finished,
			latitude: form.get('latitude'),
			longitude: form.get('longitude'),
			accuracy: form.get('accuracy'),
			returnTo: String(form.get('return_to') ?? url.searchParams.get('returnTo') ?? ''),
			recaptchaToken: String(form.get('g-recaptcha-response') ?? '') || null,
			uuid,
			user: locals.user,
			ipAddress: getClientAddress(),
			ipCountry: request.headers.get('cf-ipcountry'),
			userAgent: request.headers.get('user-agent'),
			origin: url.origin
		});

		if (!result.ok) {
			const status =
				result.error === 'not_found'
					? 404
					: result.error === 'closed' || result.error === 'banned'
						? 403
						: result.error === 'captcha'
							? 400
							: 400;
			return fail(status, {
				error: result.error,
				banCreated: result.banCreated ?? false,
				homeScore: Number.isFinite(homeScore) ? homeScore : undefined,
				awayScore: Number.isFinite(awayScore) ? awayScore : undefined,
				finished
			});
		}

		setScoreReportFlash(cookies, {
			messageKey: result.messageKey,
			homeScore: result.homeScore,
			awayScore: result.awayScore
		});
		redirect(303, result.redirectTo);
	}
};
