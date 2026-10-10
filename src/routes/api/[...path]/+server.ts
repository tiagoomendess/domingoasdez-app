import { error, redirect } from '@sveltejs/kit';
import { legacyUrl } from '#lib/server/legacy.ts';
import type { RequestHandler } from './$types';

/**
 * Unmigrated /api/* stays on the Laravel app.
 * More specific routes (/api/feed, /api/jogos/...) win by specificity and are not redirected.
 * 307 so POST/PUT clients keep the method and body.
 */
export const fallback: RequestHandler = ({ url }) => {
	const target = legacyUrl(`${url.pathname}${url.search}`);
	if (!target.startsWith('http://') && !target.startsWith('https://')) {
		error(500, 'Legacy API origin is not configured');
	}
	redirect(307, target, { external: true });
};
