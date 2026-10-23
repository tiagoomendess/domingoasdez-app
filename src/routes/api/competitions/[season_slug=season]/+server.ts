import { legacyApi, legacyJson, notFound } from '#lib/server/legacy-api/http.ts';
import { getCompetitionsBySeasonSlug } from '#lib/server/legacy-api/competitions.ts';

/** Legacy API: competitions of a season (`2025`, `2025-26` or `2025-2026`). */
export const GET = legacyApi(async ({ params }) => {
	const data = await getCompetitionsBySeasonSlug(params.season_slug ?? '');
	return data ? legacyJson(data) : notFound();
});
