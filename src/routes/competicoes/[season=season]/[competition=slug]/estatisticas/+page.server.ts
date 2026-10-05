import { error, redirect } from '@sveltejs/kit';
import { isLegacyFullYearSlug, parseSeasonSlug, seasonNameSlug } from '#lib/competitions.ts';
import { findSeasonBySlugs } from '#lib/server/competition-page.ts';
import { slugify } from '#lib/slug.ts';
import type { PageServerLoad } from './$types';

/** Old statistics URL. The view now lives on the competition page. */
export const load: PageServerLoad = async ({ params }) => {
	const { season: seasonSlug, competition: competitionSlug } = params;

	if (isLegacyFullYearSlug(seasonSlug)) {
		const years = parseSeasonSlug(seasonSlug);
		if (!years) error(404);
		const [startYear, endYear] = years;
		redirect(
			301,
			`/competicoes/${seasonNameSlug(startYear, endYear)}/${competitionSlug}?vista=estatisticas`
		);
	}

	const season = await findSeasonBySlugs(seasonSlug, competitionSlug);
	if (!season) error(404);

	const displayName = season.name?.trim() || season.competitionName;
	const displaySlug = slugify(displayName);
	const canonicalSeasonSlug = seasonNameSlug(season.startYear, season.endYear);

	redirect(301, `/competicoes/${canonicalSeasonSlug}/${displaySlug}?vista=estatisticas`);
};
