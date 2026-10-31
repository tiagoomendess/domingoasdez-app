import { error } from '@sveltejs/kit';
import { parseAction } from '#lib/placard.ts';
import {
	createRateLimit,
	placardControlBanned,
	placardControlCheck
} from '#lib/server/placard/access.ts';
import { applyPlacardAction, publicState } from '#lib/server/placard/store.ts';
import type { RequestHandler } from './$types';

/** Taps per user: plenty for a person, not for a script. */
const actions = createRateLimit(20, 5_000);

/**
 * A controller's action, JSON `PlacardAction` (`src/lib/placard.ts`). Answers with the new state.
 * Whether a score reached the game stays on the server: the controller isn't told. JSON only, like
 * the comment votes: a cross-site form can't send it without a CORS preflight.
 */
export const POST: RequestHandler = async (event) => {
	const { params, request, url, locals, setHeaders } = event;
	setHeaders({ 'cache-control': 'no-store' });
	if (!locals.user) error(401, 'Sign in to control a screen');
	// Banned score reporters can't push scores through a screen either.
	if (await placardControlBanned(event, locals.user)) error(403, 'Placard control blocked');
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
		if (result.reason === 'not_found' || result.reason === 'forbidden') {
			error(404, 'Screen not found');
		}
		// Refused for a reason the controller explains (no game, ad cooldown, ad gone, overlay on).
		return Response.json({ reason: result.reason }, { status: 409 });
	}

	return Response.json({
		state: await publicState(result.row, { origin: url.origin, forController: true })
	});
};
