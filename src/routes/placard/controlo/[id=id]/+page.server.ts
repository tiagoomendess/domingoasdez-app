import { error } from '@sveltejs/kit';
import { slugify } from '#lib/slug.ts';
import { placardControlCheck, requirePlacardController } from '#lib/server/placard/access.ts';
import { canManageClubPlacard } from '#lib/server/placard/club-setup.ts';
import { placardGame } from '#lib/server/placard/games.ts';
import { placardSquads, squadsForBrowser } from '#lib/server/placard/squads.ts';
import { findPlacard, publicState, releaseIfStale } from '#lib/server/placard/store.ts';
import type { PageServerLoad } from './$types';

/**
 * The phone's controller for one screen: its controller (or `score_update`) only. The squads for
 * substitutions come with the page, not with every poll: they don't change during a game.
 * `settingsHref` links the home club's screen setup, for whoever may manage it.
 */
export const load: PageServerLoad = async (event) => {
	const { params, url, setHeaders } = event;
	setHeaders({ 'cache-control': 'no-store' });
	const user = await requirePlacardController(event, url.pathname);

	const found = await findPlacard(Number(params.id));
	const canControl = await placardControlCheck(user.id);
	if (!found || !canControl(found)) error(404, 'Screen not found');
	const row = await releaseIfStale(found);
	const game = row.scene === 'match' && row.gameId ? await placardGame(row.gameId) : null;
	return {
		initial: await publicState(row, { origin: url.origin, forController: true }),
		squads: game ? squadsForBrowser(await placardSquads(game)) : { home: [], away: [] },
		settingsHref:
			game && (await canManageClubPlacard(user, { adminUserId: game.homeClubAdminUserId }))
				? `/clubes/${slugify(game.home.name)}/placard`
				: null
	};
};
