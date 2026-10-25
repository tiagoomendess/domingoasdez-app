import { swrCache } from '#lib/server/cache.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { listVisiblePages } from '#lib/server/pages.ts';
import type { PageServerLoad } from './$types';

/** The same for every visitor and rarely changes. */
const pagesCache = swrCache<Awaited<ReturnType<typeof listVisiblePages>>>('pages list', {
	freshMs: 5 * 60_000,
	staleMs: 5 * 60_000,
	maxEntries: 1
});

export const load: PageServerLoad = async () => {
	const pages = await pagesCache.get('all', listVisiblePages);
	return { pages, legacyHref: legacyUrl('/') };
};
