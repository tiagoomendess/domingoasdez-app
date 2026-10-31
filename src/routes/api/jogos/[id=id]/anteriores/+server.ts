import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadPastGamesPage } from '#lib/server/game-page.ts';
import { poisonFor } from '#lib/server/poison.ts';

/**
 * Next page of a game's past head-to-head meetings ("Ver mais" on the game page).
 * Signed-in users only: guests see 2 past games behind the login wall.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!locals.user) error(401, 'Sign in to see all past games');

	const offset = Number.parseInt(url.searchParams.get('offset') ?? '', 10);
	if (!Number.isFinite(offset) || offset < 0) error(400, 'Invalid offset');

	const page = await loadPastGamesPage(Number(params.id), offset);
	if (!page) error(404, 'Game not found');

	return Response.json(poisonFor(locals, page));
};
