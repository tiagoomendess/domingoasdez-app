import { legacyApi, notFound, requireAccessToken } from '#lib/server/legacy-api/http.ts';
import { readLegacyInput } from '#lib/server/legacy-api/input.ts';
import { findGameForBinding, storeScoreReport } from '#lib/server/legacy-api/score-reports.ts';

/** Legacy API: a score report from an external client (token required). */
export const POST = legacyApi(async (event) => {
	const game = await findGameForBinding(event.params.game ?? '');
	if (!game) return notFound();

	const denied = await requireAccessToken(event);
	if (denied) return denied;

	const { all } = await readLegacyInput(event.request, event.url);
	return storeScoreReport({ game, all, userAgent: event.request.headers.get('user-agent') });
});
