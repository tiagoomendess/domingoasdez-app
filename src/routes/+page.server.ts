import { LEGACY_BASE_URL, MEDIA_BASE_URL, NEW_SITE_DISCLAIMER_ENABLED } from '$app/env/private';
import type { PageServerLoad } from './$types';
import { parseTipos } from '#lib/feed.ts';
import { getFeedPage } from '#lib/server/feed/index.ts';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const types = parseTipos(url.searchParams.get('tipos'));
	const page = await getFeedPage({ types, cookies });
	const legacyOrigin = (LEGACY_BASE_URL || MEDIA_BASE_URL || '').replace(/\/$/, '');

	return {
		types,
		items: page.items,
		nextCursor: page.nextCursor,
		disclaimerHref: NEW_SITE_DISCLAIMER_ENABLED && legacyOrigin ? `${legacyOrigin}/` : null
	};
};
