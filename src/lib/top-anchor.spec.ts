import { describe, expect, it } from 'vitest';
import { anchorTop, resolveTopAnchorOffset, type AnchorBox } from '#lib/top-anchor.ts';

const phone = { width: 390, height: 844 };

function box(top: number, bottom: number, width = phone.width): AnchorBox {
	return { top, bottom, width };
}

describe('anchorTop', () => {
	it('moves a bar that starts under the island down to the safe area', () => {
		expect(anchorTop(59, 0)).toBe(59);
	});

	it('leaves a bar that is already below the island', () => {
		expect(anchorTop(59, 59)).toBeNull();
		expect(anchorTop(0, 0)).toBeNull();
	});
});

describe('resolveTopAnchorOffset', () => {
	it('stays at the top when ads are absent', () => {
		expect(resolveTopAnchorOffset(0, [], phone)).toBe(0);
	});

	it('uses the open anchor height', () => {
		expect(resolveTopAnchorOffset(150, [box(0, 150)], phone)).toBe(150);
	});

	it('uses the shorter collapsed bar', () => {
		expect(resolveTopAnchorOffset(40, [box(0, 40)], phone)).toBe(40);
	});

	it('prefers the taller of body padding and the visible bar', () => {
		expect(resolveTopAnchorOffset(40, [box(0, 150)], phone)).toBe(150);
		expect(resolveTopAnchorOffset(150, [box(0, 40)], phone)).toBe(150);
	});

	it('counts a bar that has been moved under the status bar', () => {
		expect(resolveTopAnchorOffset(209, [box(59, 209)], phone, 59)).toBe(209);
		expect(resolveTopAnchorOffset(0, [box(59, 209)], phone, 59)).toBe(209);
	});

	it('still ignores a bar that is not at the top when there is no status bar', () => {
		expect(resolveTopAnchorOffset(0, [box(59, 209)], phone, 0)).toBe(0);
	});

	it('ignores in-page units, side rails, and full-screen overlays', () => {
		expect(
			resolveTopAnchorOffset(0, [box(640, 920), box(0, 600, 160), box(0, 800), box(-80, 70)], phone)
		).toBe(0);
	});
});
