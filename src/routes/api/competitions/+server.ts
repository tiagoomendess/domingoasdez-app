import { legacyApi, legacyJson } from '#lib/server/legacy-api/http.ts';
import { getCompetitions } from '#lib/server/legacy-api/competitions.ts';

/** Legacy API: competitions of the latest season. */
export const GET = legacyApi(async () => legacyJson(await getCompetitions()));
