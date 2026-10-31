import { m } from '#lib/messages.ts';
import { loadLeaderboard } from '#lib/server/prediction-leaderboard.ts';
import type { PageServerLoad } from './$types';

// Not linked anywhere yet: the page is reachable by URL only (and `noindex`).
export const load: PageServerLoad = async ({ locals }) => {
	const viewerId = locals.user?.id ?? null;
	return {
		leaderboard: await loadLeaderboard(viewerId),
		viewerId,
		seo: {
			title: m.leaderboard_title(),
			description: m.leaderboard_meta_description()
		}
	};
};
