import type { PageServerLoad } from './$types';
import { parseTipos } from '#lib/feed.ts';
import { getFeedPage } from '#lib/server/feed/index.ts';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const types = parseTipos(url.searchParams.get('tipos'));
	const page = await getFeedPage({ types, cookies });

	return {
		types,
		items: page.items,
		nextCursor: page.nextCursor
	};
};
