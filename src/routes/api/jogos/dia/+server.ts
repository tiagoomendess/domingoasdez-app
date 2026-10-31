import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { todayInLisbon } from '#lib/format.ts';
import { isValidDay } from '#lib/games.ts';
import { getGamesForDay } from '#lib/server/games.ts';
import { logger } from '#lib/server/log.ts';
import { poisonFor } from '#lib/server/poison.ts';

const log = logger.child('api/jogos/dia');

/**
 * Lightweight poll endpoint for the Games page.
 * Used while viewing Today so live scores refresh without a full navigation.
 */
export const GET: RequestHandler = async ({ url, setHeaders, locals }) => {
	const raw = url.searchParams.get('date');
	const today = todayInLisbon();
	const date = raw && isValidDay(raw) ? raw : today;

	setHeaders({
		'cache-control': 'no-store'
	});

	try {
		const { live, groups } = await getGamesForDay(date);
		return Response.json(poisonFor(locals, { date, live, groups }));
	} catch (e) {
		log.error('could not load the games', e);
		error(500, 'Failed to load games');
	}
};
