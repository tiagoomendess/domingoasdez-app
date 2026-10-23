import { legacyApi, legacyJson } from '#lib/server/legacy-api/http.ts';
import { showPlayerUpdateRequest } from '#lib/server/legacy-api/player-update-requests.ts';

/** Legacy API: the status of a player update request. */
export const GET = legacyApi(async ({ params }) => {
	const data = /^\d+$/.test(params.id ?? '')
		? await showPlayerUpdateRequest(Number(params.id))
		: null;
	if (!data) return legacyJson({ success: false, message: 'Player update request not found' }, 404);
	return legacyJson(data);
});
