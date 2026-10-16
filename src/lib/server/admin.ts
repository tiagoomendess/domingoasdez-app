import { ADMIN_BASE_URL } from '$app/env/private';

/** Absolute URL on the new admin app (admin.domingoasdez.com). */
export function adminUrl(path = '/'): string {
	const origin = ADMIN_BASE_URL.replace(/\/$/, '');
	return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
