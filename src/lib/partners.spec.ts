import { describe, expect, it } from 'vitest';
import { partnerAfterPost, partnerRedirectUrl, type PartnerAd } from './partners';

const partners: PartnerAd[] = [
	{ id: 1, name: 'A', href: '/parceiros/1', image: '/a.jpg' },
	{ id: 2, name: 'B', href: '/parceiros/2', image: '/b.jpg' }
];

describe('partnerAfterPost', () => {
	it('shows nothing before the third post', () => {
		expect(partnerAfterPost(partners, 0)).toBeNull();
		expect(partnerAfterPost(partners, 1)).toBeNull();
	});

	it('places partners by priority and wraps when the list runs out', () => {
		expect(partnerAfterPost(partners, 2)?.id).toBe(1);
		expect(partnerAfterPost(partners, 5)?.id).toBe(2);
		expect(partnerAfterPost(partners, 8)?.id).toBe(1);
		expect(partnerAfterPost(partners, 11)?.id).toBe(2);
	});

	it('skips the slot when there are no partners', () => {
		expect(partnerAfterPost([], 2)).toBeNull();
	});
});

describe('partnerRedirectUrl', () => {
	it('adds the site origin as from', () => {
		expect(partnerRedirectUrl('https://example.com/offer', 'https://domingoasdez.com')).toBe(
			'https://example.com/offer?from=https%3A%2F%2Fdomingoasdez.com'
		);
	});

	it('keeps an existing query', () => {
		expect(partnerRedirectUrl('https://example.com/a?x=1', 'https://dad.test')).toBe(
			'https://example.com/a?x=1&from=https%3A%2F%2Fdad.test'
		);
	});

	it('rejects non-http destinations', () => {
		expect(partnerRedirectUrl('javascript:alert(1)', 'https://dad.test')).toBeNull();
		expect(partnerRedirectUrl('not a url', 'https://dad.test')).toBeNull();
	});
});
