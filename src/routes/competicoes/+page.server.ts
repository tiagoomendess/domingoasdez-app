import { swrCache } from '#lib/server/cache.ts';
import { listCompetitions } from '#lib/server/competitions.ts';
import type { PageServerLoad } from './$types';

/** The same for every visitor and rarely changes. */
const competitionsCache = swrCache<Awaited<ReturnType<typeof listCompetitions>>>(
	'competitions list',
	{ freshMs: 5 * 60_000, staleMs: 5 * 60_000, maxEntries: 1 }
);

export const load: PageServerLoad = async () => {
	const competitions = await competitionsCache.get('all', listCompetitions);
	return { competitions };
};
