import { MEDIA_BASE_URL, MEDIA_CDN_BASE_URL, MEDIA_CDN_ENABLED } from '$app/env/private';
import { legacyUrl } from '#lib/server/legacy.ts';

const DEFAULT_PROFILE = '/images/default-profile.png';

/** Strip the legacy public-disk prefix; R2 keys start at media/... not storage/media/... */
export function stripStoragePrefix(path: string): string {
	const relative = path.startsWith('/') ? path : `/${path}`;
	if (relative === '/storage') return '/';
	if (relative.startsWith('/storage/')) return relative.slice('/storage'.length);
	return relative;
}

/**
 * Turn a legacy relative media path into an absolute URL for the frontend.
 * Absolute http(s) URLs (YouTube, external images) pass through unchanged.
 *
 * When MEDIA_CDN_ENABLED is on, paths are rewritten for the R2/CDN layout:
 * `/storage/media/images/foo.jpg` → `https://cdn…/media/images/foo.jpg`.
 */
export function mediaUrl(path: string | null | undefined): string | null {
	if (!path) return null;
	if (/^https?:\/\//i.test(path)) return path;

	if (MEDIA_CDN_ENABLED) {
		const base = MEDIA_CDN_BASE_URL.replace(/\/$/, '');
		return `${base}${stripStoragePrefix(path)}`;
	}

	const base = (MEDIA_BASE_URL ?? '').replace(/\/$/, '');
	const relative = path.startsWith('/') ? path : `/${path}`;
	return `${base}${relative}`;
}

/** Profile / headshot URL with the legacy default when missing. */
export function profilePicture(path: string | null | undefined): string {
	return mediaUrl(path?.trim() || DEFAULT_PROFILE) ?? legacyUrl(DEFAULT_PROFILE);
}

/** Ports Media::getPlaceholder('16:9', id) — last digit of id picks the asset. */
export function placeholder16x9(seedId: number): string {
	return legacyUrl(`/images/16_9_placeholder_${seedId % 10}.jpg`);
}
