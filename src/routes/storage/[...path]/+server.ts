import { error, redirect } from '@sveltejs/kit';
import { legacyUrl } from '#lib/server/legacy.ts';
import type { RequestHandler } from './$types';

/** Transition shim: /storage/... is still served by the legacy site filesystem. */
export const fallback: RequestHandler = ({ params, url }) => {
	const rest = params.path?.trim() ?? '';
	const target = legacyUrl(`/storage${rest ? `/${rest}` : ''}${url.search}`);
	if (!target.startsWith('http://') && !target.startsWith('https://')) {
		error(500, 'Legacy site origin is not configured');
	}
	redirect(307, target, { external: true });
};
