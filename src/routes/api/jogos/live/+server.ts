import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasLiveGameNow } from '#lib/server/competition-page.ts';
import { logger } from '#lib/server/log.ts';

const log = logger.child('api/jogos/live');

/**
 * Lightweight poll for the shell: whether any match is in the live window.
 * Drives the Games tab live dot without fetching full match lists.
 */
export const GET: RequestHandler = async ({ setHeaders }) => {
	setHeaders({
		'cache-control': 'no-store'
	});

	try {
		const live = await hasLiveGameNow();
		return Response.json({ live });
	} catch (e) {
		log.error('could not check for live games', e);
		error(500, 'Failed to check live games');
	}
};
