import { error, redirect } from '@sveltejs/kit';
import {
	isLegacyFullYearSlug,
	parseSeasonSlug,
	seasonNameSlug
} from '#lib/competitions.ts';
import {
	findSeasonBySlugs,
	loadCompetitionPage
} from '#lib/server/competition-page.ts';
import { loadCompetitionStats } from '#lib/server/competition-stats.ts';
import { slugify } from '#lib/slug.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { season: seasonSlug, competition: competitionSlug } = params;

	// Legacy full-year slug (2025-2026) → 301 to canonical short form.
	if (isLegacyFullYearSlug(seasonSlug)) {
		const years = parseSeasonSlug(seasonSlug);
		if (!years) error(404);
		const [startYear, endYear] = years;
		redirect(301, `/competicoes/${seasonNameSlug(startYear, endYear)}/${competitionSlug}${url.search}`);
	}

	const season = await findSeasonBySlugs(seasonSlug, competitionSlug);
	if (!season) error(404);

	const displayName = season.name?.trim() || season.competitionName;
	const displaySlug = slugify(displayName);
	const canonicalSeasonSlug = seasonNameSlug(season.startYear, season.endYear);

	// Canonicalize competition display slug.
	if (displaySlug !== competitionSlug) {
		redirect(301, `/competicoes/${canonicalSeasonSlug}/${displaySlug}${url.search}`);
	}

	// Canonicalize season slug (e.g. if somehow non-canonical short form).
	if (canonicalSeasonSlug !== seasonSlug) {
		redirect(301, `/competicoes/${canonicalSeasonSlug}/${displaySlug}${url.search}`);
	}

	const [page, stats] = await Promise.all([
		loadCompetitionPage(season),
		loadCompetitionStats(season)
	]);
	const vistaParam = url.searchParams.get('vista');
	const vista =
		vistaParam === 'classificacao' || vistaParam === 'estatisticas' ? vistaParam : 'jogos';

	return {
		...page,
		vista,
		stats: {
			scorers: stats.scorers,
			attack: stats.attack,
			defense: stats.defense
		}
	};
};
