import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseCommentVote } from '#lib/comments.ts';
import { voteArticleComment } from '#lib/server/article-comments.ts';

/**
 * Up/down vote on an article comment, same contract as the match comment endpoint
 * (`/api/jogos/{id}/comentarios/{comment}/voto`): `{ "value": 1 | -1 | 0 }` in,
 * `{ score, myVote }` out, JSON only.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Sign in to vote');

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(400, 'Expected JSON');
	}
	const body: unknown = await request.json().catch(() => null);
	const value = parseCommentVote((body as { value?: unknown } | null)?.value);
	if (value == null) error(400, 'Invalid vote');

	const result = await voteArticleComment({
		articleId: Number(params.id),
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
