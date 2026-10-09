import type { LayoutServerLoad } from './$types';
import {
	BACK_BUTTON_COOKIE,
	parseBackButtonCookie,
	parseThemeButtonCookie,
	parseThemeCookie,
	THEME_BUTTON_COOKIE
} from '#lib/preferences.ts';
import { consumeScoreReportFlash } from '#lib/server/score-reports.ts';
import { m } from '#lib/messages.ts';

export const load: LayoutServerLoad = ({ cookies, depends, locals }) => {
	depends('app:preferences');

	const flash = consumeScoreReportFlash(cookies);
	let toast: { message: string; tone: 'success' | 'error' | 'info' } | null = null;
	if (flash) {
		const home = flash.homeScore ?? 0;
		const away = flash.awayScore ?? 0;
		if (flash.messageKey === 'success_no_location') {
			toast = {
				message: m.score_report_success_no_location({ home, away }),
				tone: 'success'
			};
		} else if (flash.messageKey === 'shadow') {
			toast = { message: m.score_report_success_shadow(), tone: 'success' };
		} else if (flash.messageKey === 'success') {
			toast = {
				message: m.score_report_success({ home, away }),
				tone: 'success'
			};
		}
	}

	return {
		user: locals.user,
		adsDisabled: locals.adsDisabled,
		preferences: {
			theme: parseThemeCookie(cookies.get('theme')),
			backButton: parseBackButtonCookie(cookies.get(BACK_BUTTON_COOKIE)),
			themeButton: parseThemeButtonCookie(cookies.get(THEME_BUTTON_COOKIE))
		},
		toast
	};
};
