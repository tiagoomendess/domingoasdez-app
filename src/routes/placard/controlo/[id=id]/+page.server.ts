import { error, redirect } from '@sveltejs/kit';
import { placardControlCheck, signInUrl } from '#lib/server/placard/access.ts';
import { findPlacard, publicState, releaseIfStale } from '#lib/server/placard/store.ts';
import type { PageServerLoad } from './$types';

/** The phone's controller for one screen: its controller (or `score_update`) only. */
export const load: PageServerLoad = async ({ params, locals, url, setHeaders }) => {
	if (!locals.user) redirect(303, signInUrl(url.pathname));
	setHeaders({ 'cache-control': 'no-store' });

	const found = await findPlacard(Number(params.id));
	const canControl = await placardControlCheck(locals.user.id);
	if (!found || !canControl(found)) error(404, 'Screen not found');
	const row = await releaseIfStale(found);
	return { initial: await publicState(row, { origin: url.origin, forController: true }) };
};
