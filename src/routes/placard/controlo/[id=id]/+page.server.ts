import { error, redirect } from '@sveltejs/kit';
import { placardControlCheck, signInUrl } from '#lib/server/placard/access.ts';
import { placardGame } from '#lib/server/placard/games.ts';
import { placardSquads, squadsForBrowser } from '#lib/server/placard/squads.ts';
import { findPlacard, publicState, releaseIfStale } from '#lib/server/placard/store.ts';
import type { PageServerLoad } from './$types';

/**
 * The phone's controller for one screen: its controller (or `score_update`) only. The squads for
 * substitutions come with the page, not with every poll: they don't change during a game.
 */
export const load: PageServerLoad = async ({ params, locals, url, setHeaders }) => {
	if (!locals.user) redirect(303, signInUrl(url.pathname));
	setHeaders({ 'cache-control': 'no-store' });

	const found = await findPlacard(Number(params.id));
	const canControl = await placardControlCheck(locals.user.id);
	if (!found || !canControl(found)) error(404, 'Screen not found');
	const row = await releaseIfStale(found);
	const game = row.scene === 'match' && row.gameId ? await placardGame(row.gameId) : null;
	return {
		initial: await publicState(row, { origin: url.origin, forController: true }),
		squads: game ? squadsForBrowser(await placardSquads(game)) : { home: [], away: [] }
	};
};
