import { legacyApi, legacyJson, requireAccessToken } from '#lib/server/legacy-api/http.ts';
import { readLegacyInput } from '#lib/server/legacy-api/input.ts';
import { searchClubs } from '#lib/server/legacy-api/clubs.ts';

/** Legacy API: fuzzy club search by name (token required). */
export const GET = legacyApi(async (event) => {
	const denied = await requireAccessToken(event);
	if (denied) return denied;

	const { all } = await readLegacyInput(event.request, event.url);
	const result = await searchClubs(all.name);
	if (!result) return legacyJson({ success: false, message: 'Search term is required' }, 400);
	return legacyJson(result);
});
