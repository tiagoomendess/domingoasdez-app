import {
	FEEDBACK_FORM_URL,
	LEGACY_BASE_URL,
	MEDIA_BASE_URL,
	NEW_SITE_DISCLAIMER_ENABLED
} from '$app/env/private';
import type { PageServerLoad } from './$types';
import { parseTipos } from '#lib/feed.ts';
import { getFeedPage } from '#lib/server/feed/index.ts';
import { listVisiblePartners } from '#lib/server/partners.ts';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const types = parseTipos(url.searchParams.get('tipos'));
	const [page, partners] = await Promise.all([
		getFeedPage({ types, cookies }),
		listVisiblePartners()
	]);
	const legacyOrigin = (LEGACY_BASE_URL || MEDIA_BASE_URL || '').replace(/\/$/, '');

	return {
		types,
		items: page.items,
		nextCursor: page.nextCursor,
		partners,
		disclaimerHref: NEW_SITE_DISCLAIMER_ENABLED && legacyOrigin ? `${legacyOrigin}/` : null,
		feedbackHref: FEEDBACK_FORM_URL || null
	};
};
