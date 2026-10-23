import { legacyApi, legacyJson, notFound } from '#lib/server/legacy-api/http.ts';
import { nextTeamGame } from '#lib/server/legacy-api/games.ts';

/** Legacy API: a team's next game. A non-numeric id is a 404 (legacy crashed with a 500). */
export const GET = legacyApi(async ({ params }) => {
	if (!/^\d+$/.test(params.team_id ?? '')) return notFound();
	return legacyJson(await nextTeamGame(Number(params.team_id)));
});
