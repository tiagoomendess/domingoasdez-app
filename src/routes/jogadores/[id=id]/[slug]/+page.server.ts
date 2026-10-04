import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { findPlayerById, loadPlayerPage } from '#lib/server/player-page.ts';
import { slugify } from '#lib/slug.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const id = Number.parseInt(params.id, 10);
	if (!Number.isFinite(id)) error(404, m.player_not_found());

	const player = await findPlayerById(id);
	if (!player || !player.visible) error(404, m.player_not_found());

	const canonicalSlug = slugify(player.name);
	if (canonicalSlug !== params.slug) {
		redirect(301, `/jogadores/${player.id}/${canonicalSlug}${url.search}`);
	}

	const page = await loadPlayerPage(player, locals.user);
	return {
		...page,
		seo: {
			...page.seo,
			title: player.name,
			description: m.player_meta_description(),
			ogTitle: `${player.name} - ${m.feed_brand()}`
		}
	};
};
