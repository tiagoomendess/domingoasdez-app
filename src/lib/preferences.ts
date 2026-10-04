import type { ThemePreference } from '#lib/theme.ts';

export type Preferences = {
	theme: ThemePreference;
	backButton: boolean;
};

export const BACK_BUTTON_COOKIE = 'back_button';

export function parseThemeCookie(value: string | undefined): ThemePreference {
	if (value === 'light' || value === 'dark') return value;
	return 'system';
}

export function parseBackButtonCookie(value: string | undefined): boolean {
	return value !== 'off';
}
