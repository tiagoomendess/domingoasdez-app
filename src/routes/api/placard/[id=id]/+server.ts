import { error } from '@sveltejs/kit';
import type { PlacardUnchanged } from '#lib/placard.ts';
import { placardControlBanned, placardControlCheck } from '#lib/server/placard/access.ts';
import { findPlacard, publicState, releaseIfStale } from '#lib/server/placard/store.ts';
import type { RequestHandler } from './$types';

/** The controller's poll (every 2 s): the screen's state, for its controller only. */
export const GET: RequestHandler = async (event) => {
	const { params, url, locals, setHeaders } = event;
	setHeaders({ 'cache-control': 'no-store' });
	if (!locals.user) error(401, 'Sign in to control a screen');
	if (await placardControlBanned(event, locals.user)) error(403, 'Placard control blocked');

	const now = new Date();
	const found = await findPlacard(Number(params.id));
	const canControl = await placardControlCheck(locals.user.id);
	if (!found || !canControl(found)) error(404, 'Screen not found');
	const row = await releaseIfStale(found, now);

	if (url.searchParams.get('v') === String(row.version)) {
		return Response.json({
			version: row.version,
			serverNow: now.getTime(),
			unchanged: true
		} satisfies PlacardUnchanged);
	}
	return Response.json(await publicState(row, { origin: url.origin, forController: true, now }));
};
