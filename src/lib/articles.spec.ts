import { describe, expect, it } from 'vitest';
import { articleHref, parseArticlePathParams, youtubeIdFromUrl } from './articles.ts';

describe('articleHref', () => {
	it('builds UTC date path + slugified title', () => {
		expect(
			articleHref(
				'2026-09-01T00:00:00.000Z',
				'Futebol feminino da AFPB quase duplica e chega às 14 equipas na época 2026/27'
			)
		).toBe(
			'/noticias/2026/09/01/futebol-feminino-da-afpb-quase-duplica-e-chega-as-14-equipas-na-epoca-2026-27'
		);
	});
});

describe('parseArticlePathParams', () => {
	it('accepts a valid calendar day and returns UTC bounds', () => {
		expect(parseArticlePathParams({ year: '2026', month: '09', day: '01' })).toEqual({
			year: '2026',
			month: '09',
			day: '01',
			dayStart: '2026-09-01 00:00:00',
			dayEnd: '2026-09-02 00:00:00'
		});
	});

	it('rejects impossible dates', () => {
		expect(parseArticlePathParams({ year: '2026', month: '02', day: '31' })).toBeNull();
		expect(parseArticlePathParams({ year: '26', month: '9', day: '1' })).toBeNull();
	});
});

describe('youtubeIdFromUrl', () => {
	it('parses watch, short, and embed URLs', () => {
		expect(youtubeIdFromUrl('https://www.youtube.com/watch?v=B1yk3AyorpY')).toBe('B1yk3AyorpY');
		expect(youtubeIdFromUrl('https://youtu.be/B1yk3AyorpY')).toBe('B1yk3AyorpY');
		expect(youtubeIdFromUrl('https://www.youtube.com/embed/B1yk3AyorpY')).toBe('B1yk3AyorpY');
	});

	it('returns null for non-youtube URLs', () => {
		expect(youtubeIdFromUrl('https://example.com/watch?v=abc')).toBeNull();
	});
});
