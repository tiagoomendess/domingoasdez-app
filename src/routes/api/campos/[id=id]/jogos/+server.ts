import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadPlaygroundGamesPage } from '#lib/server/playground-page.ts';

/**
 * Next page of the games played at a ground ("Ver mais" on the stadium page).
 * Signed-in users only: guests see 2 games behind the login prompt.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!locals.user) error(401, 'Sign in to see all games');

	const offset = Number.parseInt(url.searchParams.get('offset') ?? '', 10);
	if (!Number.isFinite(offset) || offset < 0) error(400, 'Invalid offset');

	const page = await loadPlaygroundGamesPage(Number(params.id), offset);
	if (!page) error(404, 'Ground not found');

	return Response.json(page);
};
