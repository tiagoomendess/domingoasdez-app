import { error, redirect } from '@sveltejs/kit';
import { legacyUrl } from '#lib/server/legacy.ts';
import type { RequestHandler } from './$types';

/** Retro-compatibility escape hatch: /antigo/... forwards to the same path on the legacy site. */
export const fallback: RequestHandler = ({ params, url }) => {
	const rest = params.path?.trim() ?? '';
	const target = legacyUrl(`/${rest}${url.search}`);
	if (!target.startsWith('http://') && !target.startsWith('https://')) {
		error(500, 'Legacy site origin is not configured');
	}
	redirect(307, target, { external: true });
};
