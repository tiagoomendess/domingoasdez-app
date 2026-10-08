import { describe, expect, it } from 'vitest';
import { feedAdAtIndex } from '#lib/ads.ts';

describe('feedAdAtIndex', () => {
	it('places an ad after the first post', () => {
		expect(feedAdAtIndex(0)).toBe(true);
	});

	it('places ads after every 10th post from the 10th', () => {
		expect(feedAdAtIndex(9)).toBe(true);
		expect(feedAdAtIndex(19)).toBe(true);
		expect(feedAdAtIndex(29)).toBe(true);
	});

	it('skips other indices', () => {
		expect(feedAdAtIndex(1)).toBe(false);
		expect(feedAdAtIndex(8)).toBe(false);
		expect(feedAdAtIndex(10)).toBe(false);
		expect(feedAdAtIndex(18)).toBe(false);
	});
});
