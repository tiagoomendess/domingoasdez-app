import { error } from '@sveltejs/kit';
import { parseAction } from '#lib/placard.ts';
import { createRateLimit, placardControlCheck } from '#lib/server/placard/access.ts';
import { applyPlacardAction, publicState } from '#lib/server/placard/store.ts';
import type { RequestHandler } from './$types';

/** Taps per user: plenty for a person, not for a script. */
const actions = createRateLimit(20, 5_000);

/**
 * A controller's action, JSON `PlacardAction` (`src/lib/placard.ts`). Answers with the new state
 * and, for score changes, what happened to the game's score (`scorePush`). JSON only, like the
 * comment votes: a cross-site form can't send it without a CORS preflight.
 */
export const POST: RequestHandler = async ({ params, request, url, locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	if (!locals.user) error(401, 'Sign in to control a screen');
	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(400, 'Expected JSON');
	}
	const action = parseAction(await request.json().catch(() => null));
	if (!action) error(400, 'Invalid action');
	const key = String(locals.user.id);
	if (!actions.allowed(key)) error(429, 'Too many actions');
	actions.hit(key);

	const result = await applyPlacardAction({
		placardId: Number(params.id),
		userId: locals.user.id,
		action,
		canControl: await placardControlCheck(locals.user.id)
	});
	if (!result.ok) {
		if (result.reason === 'not_paired') error(409, 'The screen is not showing a game');
		error(404, 'Screen not found');
	}

	return Response.json({
		state: await publicState(result.row, { origin: url.origin }),
		scorePush: result.scorePush
	});
};
