import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({
	MEDIA_BASE_URL: 'http://localhost:8000',
	MEDIA_CDN_ENABLED: false,
	MEDIA_CDN_BASE_URL: 'https://cdn.domingoasdez.com',
	LEGACY_BASE_URL: ''
}));

vi.mock('$app/env/private', () => env);

describe('mediaUrl', () => {
	beforeEach(() => {
		vi.resetModules();
		env.MEDIA_BASE_URL = 'http://localhost:8000';
		env.MEDIA_CDN_ENABLED = false;
		env.MEDIA_CDN_BASE_URL = 'https://cdn.domingoasdez.com';
	});

	it('prefixes MEDIA_BASE_URL when the CDN is off', async () => {
		const { mediaUrl } = await import('./media.ts');
		expect(mediaUrl('/storage/media/images/foo.jpg')).toBe(
			'http://localhost:8000/storage/media/images/foo.jpg'
		);
	});

	it('keeps the stored path and uses the CDN base when enabled', async () => {
		env.MEDIA_CDN_ENABLED = true;
		const { mediaUrl } = await import('./media.ts');
		expect(mediaUrl('/storage/media/images/foo.jpg')).toBe(
			'https://cdn.domingoasdez.com/storage/media/images/foo.jpg'
		);
		expect(mediaUrl('/images/default-profile.png')).toBe(
			'https://cdn.domingoasdez.com/images/default-profile.png'
		);
	});

	it('passes absolute URLs through unchanged', async () => {
		env.MEDIA_CDN_ENABLED = true;
		const { mediaUrl } = await import('./media.ts');
		expect(mediaUrl('https://youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc');
	});

	it('returns null for empty paths', async () => {
		const { mediaUrl } = await import('./media.ts');
		expect(mediaUrl(null)).toBeNull();
		expect(mediaUrl('')).toBeNull();
	});
});
