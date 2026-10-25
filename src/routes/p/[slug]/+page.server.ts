import { error } from '@sveltejs/kit';
import { swrCache } from '#lib/server/cache.ts';
import { getPageBySlug } from '#lib/server/pages.ts';
import { m } from '#lib/messages.ts';
import type { PageServerLoad } from './$types';

/** The same for every visitor and rarely changes. Unknown slugs are cached too (as null). */
const pageCache = swrCache<Awaited<ReturnType<typeof getPageBySlug>>>('page', {
	freshMs: 5 * 60_000,
	staleMs: 5 * 60_000,
	maxEntries: 100
});

export const load: PageServerLoad = async ({ params }) => {
	const page = await pageCache.get(params.slug, () => getPageBySlug(params.slug));
	if (!page) error(404, m.page_not_found());
	return { page };
};
