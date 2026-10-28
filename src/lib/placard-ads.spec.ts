import { describe, expect, it } from 'vitest';
import {
	AD_COOLDOWN_MS,
	adAvailableAt,
	isAdDuration,
	nextAdAfter,
	parseAction,
	parseHexColor,
	sniffImage
} from './placard.ts';

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe('ad rotation', () => {
	const ads = [{ id: 4 }, { id: 9 }, { id: 2 }];

	it('moves to the next ad in order, wrapping around', () => {
		expect(nextAdAfter(ads, 4)?.id).toBe(9);
		expect(nextAdAfter(ads, 2)?.id).toBe(4);
	});

	it('starts from the first ad when the current one is gone', () => {
		expect(nextAdAfter(ads, 77)?.id).toBe(4);
		expect(nextAdAfter(ads, null)?.id).toBe(4);
		expect(nextAdAfter([], 4)).toBeNull();
	});
});

describe('ad limits', () => {
	it('allows 1 to 15 whole seconds', () => {
		expect(isAdDuration(1)).toBe(true);
		expect(isAdDuration(15)).toBe(true);
		expect(isAdDuration(0)).toBe(false);
		expect(isAdDuration(16)).toBe(false);
		expect(isAdDuration(2.5)).toBe(false);
	});

	it('waits 2 minutes from the start of the last break', () => {
		expect(adAvailableAt(null)).toBe(0);
		expect(adAvailableAt(1_000)).toBe(1_000 + AD_COOLDOWN_MS);
	});

	it('parses the show_ad action', () => {
		expect(parseAction({ type: 'show_ad', adId: 3 })).toEqual({ type: 'show_ad', adId: 3 });
		expect(parseAction({ type: 'show_ad', adId: '3' })).toBeNull();
		expect(parseAction({ type: 'show_ad', adId: 0 })).toBeNull();
	});
});

describe('uploads', () => {
	it('tells image formats by their first bytes', () => {
		expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47))?.type).toBe('image/png');
		expect(sniffImage(bytes(0xff, 0xd8, 0xff))?.extension).toBe('jpg');
		expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38))?.extension).toBe('gif');
		expect(
			sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))?.type
		).toBe('image/webp');
		expect(sniffImage(bytes(0x3c, 0x73, 0x76, 0x67))).toBeNull(); // "<svg": not allowed
		expect(sniffImage(new Uint8Array([0x89, 0x50]))).toBeNull();
	});

	it('accepts #rrggbb colours only', () => {
		expect(parseHexColor(' #A1B2C3 ')).toBe('#a1b2c3');
		expect(parseHexColor('#abc')).toBeNull();
		expect(parseHexColor('red')).toBeNull();
		expect(parseHexColor(null)).toBeNull();
	});
});
