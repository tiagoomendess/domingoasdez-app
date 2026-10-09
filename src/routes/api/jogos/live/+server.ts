import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasLiveGameNow } from '#lib/server/competition-page.ts';

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
		return json({ live });
	} catch (e) {
		console.error('[api/jogos/live]', e);
		error(500, 'Failed to check live games');
	}
};
