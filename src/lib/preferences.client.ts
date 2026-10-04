import { invalidate } from '$app/navigation';
import { setThemePreference, type ThemePreference } from '#lib/theme.ts';
import { BACK_BUTTON_COOKIE } from '#lib/preferences.ts';

const YEAR = 31_536_000;

function writeCookie(name: string, value: string | null) {
	if (value === null) {
		document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
	} else {
		document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
	}
}

export async function setAppearance(preference: ThemePreference) {
	setThemePreference(preference);
	await invalidate('app:preferences');
}

export async function setBackButton(enabled: boolean) {
	writeCookie(BACK_BUTTON_COOKIE, enabled ? null : 'off');
	await invalidate('app:preferences');
}
