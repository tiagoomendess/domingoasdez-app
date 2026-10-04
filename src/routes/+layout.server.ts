import type { LayoutServerLoad } from './$types';
import { parseBackButtonCookie, parseThemeCookie } from '#lib/preferences.ts';

export const load: LayoutServerLoad = ({ cookies, depends, locals }) => {
	depends('app:preferences');

	return {
		user: locals.user,
		preferences: {
			theme: parseThemeCookie(cookies.get('theme')),
			backButton: parseBackButtonCookie(cookies.get('back_button'))
		}
	};
};
