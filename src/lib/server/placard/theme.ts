import type { PlacardTheme } from '#lib/placard.ts';
import { clubPlacardLook } from './club-setup.ts';

/** Look of a stadium screen when the home club hasn't set one (or the screen isn't on a game). */
export const DEFAULT_PLACARD_THEME: PlacardTheme = {
	background: '#08090b',
	backgroundImage: null,
	foreground: '#f3f5f8',
	muted: '#a8b0bd',
	accent: '#5cb6ea',
	showNames: true
};

/**
 * The look of a screen: the home club's colours and background image over the default. A club
 * picks only a text colour, so the secondary text (clock, dash) is that colour a little faded and
 * the accent (period, pairing code) is the colour itself.
 */
export async function resolvePlacardTheme(homeClubId: number | null): Promise<PlacardTheme> {
	if (homeClubId === null) return DEFAULT_PLACARD_THEME;
	const look = await clubPlacardLook(homeClubId);
	const text = look.textColor;
	return {
		...DEFAULT_PLACARD_THEME,
		background: look.backgroundColor ?? DEFAULT_PLACARD_THEME.background,
		backgroundImage: look.backgroundImage,
		...(text && {
			foreground: text,
			muted: `color-mix(in srgb, ${text} 72%, transparent)`,
			accent: text
		})
	};
}
