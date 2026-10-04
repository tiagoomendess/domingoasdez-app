export type ThemePreference = 'system' | 'light' | 'dark';

const COOKIE = 'theme';
/** Keep in sync with the theme-color metas and inline canvas in `src/app.html`. */
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

function syncBrowserChrome(dark: boolean) {
	const preference = getThemePreference();
	const metas = document.querySelectorAll('meta[name="theme-color"]');

	if (preference === 'system') {
		for (const meta of metas) {
			const media = meta.getAttribute('media') ?? '';
			if (media.includes('dark')) meta.setAttribute('content', THEME_COLORS.dark);
			else if (media.includes('light')) meta.setAttribute('content', THEME_COLORS.light);
			else meta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
		}
	} else {
		const color = dark ? THEME_COLORS.dark : THEME_COLORS.light;
		for (const meta of metas) meta.setAttribute('content', color);
	}

	document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

function applyTheme(dark: boolean) {
	const update = () => {
		document.documentElement.classList.toggle('dark', dark);
		syncBrowserChrome(dark);
	};

	if (isDark() === dark) {
		syncBrowserChrome(dark);
		return;
	}

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!document.startViewTransition || reduceMotion) update();
	else document.startViewTransition(update);
}
