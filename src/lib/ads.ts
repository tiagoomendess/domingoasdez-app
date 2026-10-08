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
 * PWA vignette close button: installed standalone switches the status-bar meta from
 * `black-translucent` to `default` so the layout viewport starts below the clock.
 * That is the best we can do from our side — Google still owns the overlay. Confirm
 * on a real home-screen install; if the X remains untappable, turn vignettes off for
 * that surface in the AdSense console.
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

/** After 1st post (index 0) and after every 10th post from the 10th (indices 9, 19, 29, …). */
export function feedAdAtIndex(index: number): boolean {
	if (index === 0) return true;
	return index >= 9 && (index + 1) % 10 === 0;
}
