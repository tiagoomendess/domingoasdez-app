import { describe, expect, it } from 'vitest';
import { resolveTopAnchorOffset, type AnchorBox } from '#lib/top-anchor.ts';

const phone = { width: 390, height: 844 };

function box(top: number, bottom: number, width = phone.width): AnchorBox {
	return { top, bottom, width };
}

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

	it('ignores in-page units, side rails, and full-screen overlays', () => {
		expect(
			resolveTopAnchorOffset(0, [box(640, 920), box(0, 600, 160), box(0, 800), box(-80, 70)], phone)
		).toBe(0);
	});
});
