import { LEGACY_BASE_URL, MEDIA_BASE_URL } from '$app/env/private';

/** Absolute URL on the legacy Laravel site (media, backoffice, forms). */
export function legacyUrl(path: string): string {
	const configured = (LEGACY_BASE_URL || MEDIA_BASE_URL || '').replace(/\/$/, '');
	const relative = path.startsWith('/') ? path : `/${path}`;
	return `${configured}${relative}`;
}
