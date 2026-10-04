import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { todayInLisbon } from '#lib/format.ts';
import { isValidDay } from '#lib/games.ts';
import { getGamesForDay } from '#lib/server/games.ts';

/**
 * Lightweight poll endpoint for the Games page.
 * Used while viewing Today so live scores refresh without a full navigation.
 */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const raw = url.searchParams.get('date');
	const today = todayInLisbon();
	const date = raw && isValidDay(raw) ? raw : today;

	setHeaders({
		'cache-control': 'no-store'
	});

	try {
		const { live, groups } = await getGamesForDay(date);
		return json({ date, live, groups });
	} catch (e) {
		console.error('[api/jogos/dia]', e);
		error(500, 'Failed to load games');
	}
};
