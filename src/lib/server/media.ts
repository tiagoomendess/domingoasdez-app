import { MEDIA_BASE_URL } from '$app/env/private';
import { legacyUrl } from '#lib/server/legacy.ts';

const DEFAULT_PROFILE = '/images/default-profile.png';

/**
 * Turn a legacy relative media path into an absolute URL served by the old site.
 * Absolute http(s) URLs (YouTube, external images) pass through unchanged.
 */
export function mediaUrl(path: string | null | undefined): string | null {
	if (!path) return null;
	if (/^https?:\/\//i.test(path)) return path;

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
