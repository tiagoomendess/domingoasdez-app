import { dayRange, isValidDay } from '#lib/games.ts';
import { todayInLisbon } from '#lib/format.ts';
import { getDayMarkers, getGamesForDay, getNextGameDay } from '#lib/server/games.ts';
import type { PageServerLoad } from './$types';

const RAIL_RADIUS = 14;

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('app:games');

	const today = todayInLisbon();
	const raw = url.searchParams.get('date');
	const selected = raw && isValidDay(raw) ? raw : today;
	const days = dayRange(selected, RAIL_RADIUS, RAIL_RADIUS);

	const [{ live, groups }, markers, nextGameDay] = await Promise.all([
		getGamesForDay(selected),
		getDayMarkers(days[0], days[days.length - 1]),
		getNextGameDay(selected)
	]);

	return {
		today,
		selected,
		days,
		markers,
		live,
		groups,
		nextGameDay,
		isEmpty: live.length === 0 && groups.length === 0
	};
};
