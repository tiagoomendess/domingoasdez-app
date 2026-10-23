import { legacyApi, legacyJson, requireAccessToken } from '#lib/server/legacy-api/http.ts';
import { readLegacyInput } from '#lib/server/legacy-api/input.ts';
import { listPlayers } from '#lib/server/legacy-api/players.ts';

/** Legacy API: visible players, paginated (token required). */
export const GET = legacyApi(async (event) => {
	const denied = await requireAccessToken(event);
	if (denied) return denied;

	const { all } = await readLegacyInput(event.request, event.url);
	return legacyJson(await listPlayers(all));
});
