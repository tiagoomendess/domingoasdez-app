import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	MEDIA_BASE_URL: 'http://localhost:8000'
}));

import { prepareArticleHtml, prepareCmsHtml, rewriteLegacyMediaUrls } from './html.ts';

describe('rewriteLegacyMediaUrls', () => {
	it('prefixes relative storage and images paths', () => {
		const html =
			'<img src="/storage/media/images/foo.jpg " /><a href="/images/16_9_placeholder_1.jpg">x</a>';
		expect(rewriteLegacyMediaUrls(html)).toBe(
			'<img src="http://localhost:8000/storage/media/images/foo.jpg" /><a href="http://localhost:8000/images/16_9_placeholder_1.jpg">x</a>'
		);
	});

	it('leaves absolute URLs alone', () => {
		const html = '<img src="https://cdn.example/a.jpg" />';
		expect(rewriteLegacyMediaUrls(html)).toBe(html);
	});
});

describe('prepareCmsHtml', () => {
	it('strips scripts and rewrites media', () => {
		const html = '<p>Oi</p><script>alert(1)</script><img src="/storage/media/images/a.jpg" />';
		const out = prepareCmsHtml(html);
		expect(out).not.toContain('<script');
		expect(out).toContain('http://localhost:8000/storage/media/images/a.jpg');
		expect(out).toContain('<p>Oi</p>');
	});

	it('keeps video tags and rewrites their src', () => {
		const html = '<video controls muted src="/storage/media/videos/demo.mp4" width="100%"></video>';
		const out = prepareCmsHtml(html);
		expect(out).toContain('<video');
		expect(out).toContain('http://localhost:8000/storage/media/videos/demo.mp4');
		expect(out).toContain('controls');
	});

	it('is aliased as prepareArticleHtml', () => {
		expect(prepareArticleHtml('<p>x</p>')).toBe(prepareCmsHtml('<p>x</p>'));
	});
});
