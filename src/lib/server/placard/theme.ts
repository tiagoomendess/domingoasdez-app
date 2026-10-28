import type { PlacardTheme } from '#lib/placard.ts';

/**
 * Look of the stadium screens. Every screen uses the default for now; when clubs get their own
 * look, this reads the home club's theme (falling back to the default), and the screen keeps
 * consuming only this object.
 */
export const DEFAULT_PLACARD_THEME: PlacardTheme = {
	background: '#08090b',
	foreground: '#f3f5f8',
	muted: '#a8b0bd',
	accent: '#5cb6ea',
	showNames: true
};

export async function resolvePlacardTheme(homeClubId: number | null): Promise<PlacardTheme> {
	void homeClubId;
	return DEFAULT_PLACARD_THEME;
}
