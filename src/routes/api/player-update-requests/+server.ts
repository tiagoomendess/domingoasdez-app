import { legacyApi, requireAccessToken } from '#lib/server/legacy-api/http.ts';
import { readLegacyInput } from '#lib/server/legacy-api/input.ts';
import { storePlayerUpdateRequest } from '#lib/server/legacy-api/player-update-requests.ts';

/** Legacy API: a request to create or update a player (token required). */
export const POST = legacyApi(async (event) => {
	const denied = await requireAccessToken(event);
	if (denied) return denied;

	const { all } = await readLegacyInput(event.request, event.url);
	return storePlayerUpdateRequest(all);
});
