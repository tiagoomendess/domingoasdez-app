import { legacyApi, legacyJson } from '#lib/server/legacy-api/http.ts';
import { liveMatches } from '#lib/server/legacy-api/live.ts';

/** Legacy API: today's live games by game group (used by external scripts). */
export const GET = legacyApi(async ({ url }) => legacyJson(await liveMatches(url.origin)));
