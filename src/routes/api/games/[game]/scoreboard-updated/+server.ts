import { legacyApi, notFound, requireAccessToken } from '#lib/server/legacy-api/http.ts';
import { readLegacyInput } from '#lib/server/legacy-api/input.ts';
import { findGameForBinding, scoreboardUpdated } from '#lib/server/legacy-api/score-reports.ts';

/** Legacy API: the stadium scoreboard pushes the current score (token required). */
export const PUT = legacyApi(async (event) => {
	const game = await findGameForBinding(event.params.game ?? '');
	if (!game) return notFound();

	const denied = await requireAccessToken(event);
	if (denied) return denied;

	const { all, json } = await readLegacyInput(event.request, event.url);
	return scoreboardUpdated({ game, all, json });
});
