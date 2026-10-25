/**
 * Article comments. Ports Front\ArticleCommentsController (comment, delete) and
 * Api\ArticleCommentsController@get from the legacy site, on the same `article_comments` table.
 * Up/down votes (`article_comment_votes`) are new here, as on match comments.
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import {
	buildCommentTree,
	commentCooldownLeft,
	validateComment,
	type CommentVote,
	type VotedComment
} from '#lib/comments.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { db } from '#lib/server/db/index.ts';
import {
	articleCommentVotes,
	articleComments,
	userProfiles,
	users
} from '#lib/server/db/schema.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { logger } from '#lib/server/log.ts';
import { mediaUrl } from '#lib/server/media.ts';

const log = logger.child('article-comments');

/** Legacy delete rule: `has_permission('admin')`, or the comment's own author. */
async function isAdmin(userId: number) {
	return hasPermission(await getUserPermissionNames(userId), 'admin');
}

function toVote(value: number | null | undefined): CommentVote {
	return value == null || value === 0 ? 0 : value > 0 ? 1 : -1;
}

const scoreSum = sql<number>`COALESCE(SUM(${articleCommentVotes.value}), 0)`.mapWith(Number);

export async function listArticleComments(
	articleId: number,
	viewerId: number | null
): Promise<VotedComment[]> {
	const [rows, votes, admin] = await Promise.all([
		db
			.select({
				id: articleComments.id,
				parentId: articleComments.articleCommentId,
				content: articleComments.content,
				userId: articleComments.userId,
				deleted: articleComments.deleted,
				createdAt: articleComments.createdAt,
				name: users.name,
				email: users.email,
				picture: userProfiles.picture
			})
			.from(articleComments)
			.innerJoin(users, eq(articleComments.userId, users.id))
			.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
			.where(eq(articleComments.articleId, articleId)),
		db
			.select({
				commentId: articleCommentVotes.articleCommentId,
				score: scoreSum,
				myVote:
					viewerId == null
						? sql<number>`0`.mapWith(Number)
						: sql<number>`COALESCE(MAX(CASE WHEN ${articleCommentVotes.userId} = ${viewerId} THEN ${articleCommentVotes.value} END), 0)`.mapWith(
								Number
							)
			})
			.from(articleCommentVotes)
			.innerJoin(articleComments, eq(articleComments.id, articleCommentVotes.articleCommentId))
			.where(eq(articleComments.articleId, articleId))
			.groupBy(articleCommentVotes.articleCommentId),
		viewerId == null ? false : isAdmin(viewerId)
	]);

	const votesById = new Map(votes.map((vote) => [vote.commentId, vote]));

	return buildCommentTree(
		rows.map((row) => {
			const vote = votesById.get(row.id);
			const mine = viewerId != null && row.userId === viewerId;
			return {
				id: row.id,
				parentId: row.parentId,
				deleted: row.deleted,
				content: row.content ?? '',
				// Same fallback as the signed-in user's name (toAuthUser).
				authorName: row.name?.trim() || row.email?.split('@')[0] || 'Utilizador',
				authorPicture: mediaUrl(row.picture),
				date: row.createdAt ? naiveToIso(row.createdAt) : new Date(0).toISOString(),
				canDelete: viewerId != null && (admin || mine),
				score: vote?.score ?? 0,
				myVote: toVote(vote?.myVote),
				mine
			};
		})
	);
}

export type PostCommentResult =
	| { ok: true; id: number }
	| { ok: false; error: 'empty' | 'too_long' | 'too_fast' | 'parent_not_found' };

export async function postArticleComment(input: {
	articleId: number;
	userId: number;
	content: unknown;
	parentId: number | null;
}): Promise<PostCommentResult> {
	const valid = validateComment(input.content);
	if (!valid.ok) return valid;

	const [last] = await db
		.select({ createdAt: articleComments.createdAt })
		.from(articleComments)
		.where(eq(articleComments.userId, input.userId))
		.orderBy(desc(articleComments.id))
		.limit(1);
	if (commentCooldownLeft(last?.createdAt ? naiveToIso(last.createdAt) : null) > 0) {
		log.info(`user ${input.userId} tried to comment too fast`);
		return { ok: false, error: 'too_fast' };
	}

	// Replies hang off a visible comment of the same article. The legacy route took any id.
	let parentId: number | null = null;
	if (input.parentId != null) {
		const [parent] = await db
			.select({ id: articleComments.id, parentId: articleComments.articleCommentId })
			.from(articleComments)
			.where(
				and(
					eq(articleComments.id, input.parentId),
					eq(articleComments.articleId, input.articleId),
					eq(articleComments.deleted, false)
				)
			)
			.limit(1);
		if (!parent) return { ok: false, error: 'parent_not_found' };
		// Threads are one level deep: replying to a reply joins the same thread.
		parentId = parent.parentId ?? parent.id;
	}

	const now = new Date();
	const inserted = await db.insert(articleComments).values({
		articleId: input.articleId,
		articleCommentId: parentId,
		content: valid.content,
		userId: input.userId,
		deleted: false,
		createdAt: now,
		updatedAt: now
	});

	log.info(`user ${input.userId} commented on article ${input.articleId}`);
	return { ok: true, id: Number(inserted[0].insertId) };
}

export type DeleteCommentResult = { ok: true } | { ok: false; error: 'not_found' | 'forbidden' };

/** Soft delete (`deleted = 1`), like the legacy site, so the row and its thread stay on file. */
export async function deleteArticleComment(input: {
	articleId: number;
	commentId: number;
	userId: number;
}): Promise<DeleteCommentResult> {
	const [comment] = await db
		.select({ id: articleComments.id, userId: articleComments.userId })
		.from(articleComments)
		.where(
			and(
				eq(articleComments.id, input.commentId),
				eq(articleComments.articleId, input.articleId),
				eq(articleComments.deleted, false)
			)
		)
		.limit(1);
	if (!comment) return { ok: false, error: 'not_found' };

	if (comment.userId !== input.userId && !(await isAdmin(input.userId))) {
		log.info(`user ${input.userId} tried to delete comment ${input.commentId} without permission`);
		return { ok: false, error: 'forbidden' };
	}

	await db
		.update(articleComments)
		.set({ deleted: true, updatedAt: new Date() })
		.where(eq(articleComments.id, comment.id));

	log.info(`user ${input.userId} deleted comment ${input.commentId}`);
	return { ok: true };
}

export type VoteCommentResult =
	| { ok: true; score: number; myVote: CommentVote }
	| { ok: false; error: 'not_found' | 'own_comment' };

/** One vote per user and comment: +1 / -1 sets it, 0 removes it. Not on your own comment. */
export async function voteArticleComment(input: {
	articleId: number;
	commentId: number;
	userId: number;
	value: CommentVote;
}): Promise<VoteCommentResult> {
	const [comment] = await db
		.select({ id: articleComments.id, userId: articleComments.userId })
		.from(articleComments)
		.where(
			and(
				eq(articleComments.id, input.commentId),
				eq(articleComments.articleId, input.articleId),
				eq(articleComments.deleted, false)
			)
		)
		.limit(1);
	if (!comment) return { ok: false, error: 'not_found' };
	if (comment.userId === input.userId) return { ok: false, error: 'own_comment' };

	if (input.value === 0) {
		await db
			.delete(articleCommentVotes)
			.where(
				and(
					eq(articleCommentVotes.articleCommentId, comment.id),
					eq(articleCommentVotes.userId, input.userId)
				)
			);
	} else {
		const now = new Date();
		await db
			.insert(articleCommentVotes)
			.values({
				articleCommentId: comment.id,
				userId: input.userId,
				value: input.value,
				createdAt: now,
				updatedAt: now
			})
			.onDuplicateKeyUpdate({ set: { value: input.value, updatedAt: now } });
	}

	const [total] = await db
		.select({ score: scoreSum })
		.from(articleCommentVotes)
		.where(eq(articleCommentVotes.articleCommentId, comment.id));

	log.info(`user ${input.userId} voted ${input.value} on comment ${comment.id}`);
	return { ok: true, score: total?.score ?? 0, myVote: input.value };
}
