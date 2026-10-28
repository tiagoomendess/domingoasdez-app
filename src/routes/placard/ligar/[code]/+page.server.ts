import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { normalizePairingCode } from '#lib/placard.ts';
import { signInUrl } from '#lib/server/placard/access.ts';
import { placardGames } from '#lib/server/placard/games.ts';
import { isPairingCodeLive, pairPlacard } from '#lib/server/placard/store.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Where the TV's QR code leads: pick one of today's games for that screen. Replaces the old
 * `/scoreboards/{code}/admin` → `/matches` hop, which set a cookie on the phone and could pair a
 * stale code with the wrong TV.
 */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, signInUrl(url.pathname));
	const code = normalizePairingCode(params.code);
	if (!code) redirect(303, '/placard/ligar');
	if (code !== params.code) redirect(303, `/placard/ligar/${code}`);

	const [live, games] = await Promise.all([isPairingCodeLive(code), placardGames()]);
	return { code, live, games };
};

export const actions: Actions = {
	default: async ({ params, request, locals, url }) => {
		if (!locals.user) redirect(303, signInUrl(url.pathname));
		const code = normalizePairingCode(params.code);
		if (!code) redirect(303, '/placard/ligar');

		const gameId = Number((await request.formData()).get('game'));
		const game = (await placardGames()).find((candidate) => candidate.id === gameId);
		if (!game) return fail(400, { error: m.placard_pair_game_invalid() });

		const result = await pairPlacard({ code, game, userId: locals.user.id });
		if (!result.ok) return fail(409, { error: m.placard_pair_code_expired() });
		redirect(303, `/placard/controlo/${result.placardId}`);
	}
};
