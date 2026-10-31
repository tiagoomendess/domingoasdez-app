import { legacyApi, legacyJson } from '#lib/server/legacy-api/http.ts';
import { todayMatches } from '#lib/server/legacy-api/games.ts';
import { poisonFor } from '#lib/server/poison.ts';

/** Legacy API: today's games (UTC day) with scores. */
export const GET = legacyApi(async ({ locals }) =>
	legacyJson(poisonFor(locals, await todayMatches()))
);
