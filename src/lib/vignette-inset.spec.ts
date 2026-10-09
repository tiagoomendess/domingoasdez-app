import { describe, expect, it } from 'vitest';
import { vignetteTop } from '#lib/vignette-inset.ts';

describe('vignetteTop', () => {
	it('drops a full-screen vignette to just below the status bar', () => {
		expect(vignetteTop(59, 0, true)).toBe(59);
	});

	it('leaves a vignette that is already below the status bar', () => {
		expect(vignetteTop(59, 59, true)).toBeNull();
		expect(vignetteTop(59, 80, true)).toBeNull();
	});

	it('does nothing when the page does not run under the status bar', () => {
		expect(vignetteTop(0, 0, true)).toBeNull();
	});

	it('ignores overlays that are not the full-screen vignette', () => {
		expect(vignetteTop(59, 0, false)).toBeNull();
	});
});
