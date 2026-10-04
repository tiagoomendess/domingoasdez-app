export type ThemePreference = 'system' | 'light' | 'dark';

const COOKIE = 'theme';
const THEME_COLORS = { light: '#f2f4f7', dark: '#08090b' };

export function getThemePreference(): ThemePreference {
	const match = document.cookie.match(/(?:^|; )theme=(light|dark)/);
	return match ? (match[1] as 'light' | 'dark') : 'system';
}

export function isDark() {
	return document.documentElement.classList.contains('dark');
}

export function setThemePreference(preference: ThemePreference) {
	if (preference === 'system') {
		document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
	} else {
		document.cookie = `${COOKIE}=${preference}; path=/; max-age=31536000; samesite=lax`;
	}

	const dark =
		preference === 'system'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: preference === 'dark';
	applyTheme(dark);
}

export function toggleTheme(): ThemePreference {
	const next = isDark() ? 'light' : 'dark';
	setThemePreference(next);
	return next;
}

function applyTheme(dark: boolean) {
	if (isDark() === dark) return;

	const update = () => {
		document.documentElement.classList.toggle('dark', dark);
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
	};

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!document.startViewTransition || reduceMotion) update();
	else document.startViewTransition(update);
}
