/**
 * AdSense placement config.
 *
 * Console setup (manual — not code):
 * - Enable Auto ads for **vignette** and **side rail** (desktop gutters). Leave anchor
 *   (sticky bottom) and in-page Auto ads off so they do not fight these manual units
 *   or the tab bar.
 * - Exclude `/conta` (and subpaths) from Auto ads so account pages stay ad-free.
 * - Create a Display unit for `horizontal`, then paste its slot ID below.
 *   Empty strings are skipped by AdSenseUnit (safe until the unit exists).
 *
 * Live slots today: feed/auto `6406546239`, article end `7397948298`.
 *
 * Home-screen iOS draws under the status bar. `watchVignetteInset` shifts the
 * vignette overlay down by `safe-area-inset-top` so the close button clears the
 * clock and battery. Google owns the button; we only move its frame.
 */

export const adSlots = {
	/** Unrestricted / responsive Display unit (feed, article mid, empty states, page bottoms). */
	auto: '6406546239',
	/** Existing article footer unit. */
	articleEnd: '7397948298',
	/** Horizontal Display unit — set when created in AdSense. */
	horizontal: '' as string
};

export type AdShape = 'auto' | 'horizontal';

/**
 * Opt-out, not a capability: `admin` does not imply this.
 * Only an explicit `disable_ads` grant suppresses AdSense.
 */
export function adsDisabled(permissionNames: ReadonlySet<string>): boolean {
	return permissionNames.has('disable_ads');
}

/** After 1st post (index 0) and after every 10th post from the 10th (indices 9, 19, 29, …). */
export function feedAdAtIndex(index: number): boolean {
	if (index === 0) return true;
	return index >= 9 && (index + 1) % 10 === 0;
}
