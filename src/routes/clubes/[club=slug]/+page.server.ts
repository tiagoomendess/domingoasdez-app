import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { findClubBySlug, loadClubPage } from '#lib/server/club-page.ts';
import { slugify } from '#lib/slug.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const club = await findClubBySlug(params.club);
	if (!club) error(404, m.club_not_found());

	const canonicalSlug = slugify(club.name);
	if (canonicalSlug !== params.club) {
		redirect(301, `/clubes/${canonicalSlug}${url.search}`);
	}

	const page = await loadClubPage(club, locals.user);
	return {
		...page,
		seo: {
			...page.seo,
			title: club.name,
			description: m.club_meta_description(),
			ogTitle: `${club.name} - ${m.feed_brand()}`
		},
		selectedTeamId: parseTeamId(url.searchParams.get('equipa'), page.teams)
	};
};

function parseTeamId(raw: string | null, teams: { id: number }[]): number | null {
	if (teams.length === 0) return null;
	if (raw) {
		const id = Number.parseInt(raw, 10);
		if (Number.isFinite(id) && teams.some((t) => t.id === id)) return id;
	}
	return teams[0].id;
}
