import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseCommentVote } from '#lib/comments.ts';
import { voteMatchComment } from '#lib/server/match-comments.ts';

/**
 * Up/down vote on a match comment: `{ "value": 1 | -1 | 0 }` (0 removes the vote), answered
 * with `{ score, myVote }`. JSON rather than a form action, so a vote doesn't re-run the whole
 * game page load. JSON only: a cross-site form can't send it without a CORS preflight.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Sign in to vote');

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(400, 'Expected JSON');
	}
	const body: unknown = await request.json().catch(() => null);
	const value = parseCommentVote((body as { value?: unknown } | null)?.value);
	if (value == null) error(400, 'Invalid vote');

	const result = await voteMatchComment({
		gameId: Number(params.id),
		commentId: Number(params.comment),
		userId: locals.user.id,
		value
	});
	if (!result.ok) {
		if (result.error === 'own_comment') error(403, 'You cannot vote on your own comment');
		error(404, 'Comment not found');
	}

	return Response.json({ score: result.score, myVote: result.myVote });
};
