import type { ThemePreference } from '#lib/theme.ts';

export type Preferences = {
	theme: ThemePreference;
	backButton: boolean;
	themeButton: boolean;
};

export const BACK_BUTTON_COOKIE = 'back_button';
export const THEME_BUTTON_COOKIE = 'theme_button';

export function parseThemeCookie(value: string | undefined): ThemePreference {
	if (value === 'light' || value === 'dark') return value;
	return 'system';
}

export function parseBackButtonCookie(value: string | undefined): boolean {
	return value !== 'off';
}

export function parseThemeButtonCookie(value: string | undefined): boolean {
	return value !== 'off';
}
