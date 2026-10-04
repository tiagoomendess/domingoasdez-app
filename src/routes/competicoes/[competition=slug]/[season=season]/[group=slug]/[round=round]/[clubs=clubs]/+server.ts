import { redirect } from '@sveltejs/kit';
import { isLegacyFullYearSlug, parseSeasonSlug, seasonNameSlug } from '#lib/competitions.ts';
import type { RequestHandler } from './$types';

/**
 * Legacy competition-first game URL → season-first canonical.
 * /competicoes/{competition}/{season}/{group}/{round}/{clubs}
 */
export const GET: RequestHandler = ({ params }) => {
	const {
		competition: competitionSlug,
		season: seasonSlug,
		group: groupSlug,
		round,
		clubs
	} = params;

	let canonicalSeason = seasonSlug;
	if (isLegacyFullYearSlug(seasonSlug)) {
		const years = parseSeasonSlug(seasonSlug);
		if (years) {
			const [startYear, endYear] = years;
			canonicalSeason = seasonNameSlug(startYear, endYear);
		}
	}

	redirect(
		301,
		`/competicoes/${canonicalSeason}/${competitionSlug}/${groupSlug}/${round}/${clubs}`
	);
};
