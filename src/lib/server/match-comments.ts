/**
 * Match comments: comments on a game page, with up/down votes. New in this app (the legacy site
 * had none); the rules for posting and deleting follow the article comments
 * (`#lib/server/article-comments.ts`) on the `match_comments` table.
 */
import { and, desc, eq, isNotNull, or, sql } from 'drizzle-orm';
import {
	buildCommentTree,
	commentCooldownLeft,
	validateComment,
	type CommentVote,
	type VotedComment
} from '#lib/comments.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { db } from '#lib/server/db/index.ts';
import { matchCommentVotes, matchComments, userProfiles, users } from '#lib/server/db/schema.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { mediaUrl } from '#lib/server/media.ts';

/** Same delete rule as article comments: `admin`, or the comment's own author. */
async function isAdmin(userId: number) {
	return hasPermission(await getUserPermissionNames(userId), 'admin');
}

function toVote(value: number | null | undefined): CommentVote {
	return value == null || value === 0 ? 0 : value > 0 ? 1 : -1;
}

const scoreSum = sql<number>`COALESCE(SUM(${matchCommentVotes.value}), 0)`.mapWith(Number);

export async function listMatchComments(
	gameId: number,
	viewerId: number | null
): Promise<VotedComment[]> {
	const [rows, votes, admin] = await Promise.all([
		db
			.select({
				id: matchComments.id,
				parentId: matchComments.matchCommentId,
				content: matchComments.content,
				userId: matchComments.userId,
				deleted: matchComments.deleted,
				createdAt: matchComments.createdAt,
				name: users.name,
				email: users.email,
				picture: userProfiles.picture
			})
			.from(matchComments)
			.innerJoin(users, eq(matchComments.userId, users.id))
			.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
			.where(
				and(
					eq(matchComments.gameId, gameId),
					// The legacy account-deletion job blanks name and email but only wipes
					// article_comments, so comments by deleted accounts are hidden here.
					or(isNotNull(users.name), isNotNull(users.email))
				)
			),
		db
			.select({
				commentId: matchCommentVotes.matchCommentId,
				score: scoreSum,
				myVote:
					viewerId == null
						? sql<number>`0`.mapWith(Number)
						: sql<number>`COALESCE(MAX(CASE WHEN ${matchCommentVotes.userId} = ${viewerId} THEN ${matchCommentVotes.value} END), 0)`.mapWith(
								Number
							)
			})
			.from(matchCommentVotes)
			.innerJoin(matchComments, eq(matchComments.id, matchCommentVotes.matchCommentId))
			.where(eq(matchComments.gameId, gameId))
			.groupBy(matchCommentVotes.matchCommentId),
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

export type PostMatchCommentResult =
	| { ok: true; id: number }
	| { ok: false; error: 'empty' | 'too_long' | 'too_fast' | 'parent_not_found' };

export async function postMatchComment(input: {
	gameId: number;
	userId: number;
	content: unknown;
	parentId: number | null;
}): Promise<PostMatchCommentResult> {
	const valid = validateComment(input.content);
	if (!valid.ok) return valid;

	const [last] = await db
		.select({ createdAt: matchComments.createdAt })
		.from(matchComments)
		.where(eq(matchComments.userId, input.userId))
		.orderBy(desc(matchComments.id))
		.limit(1);
	if (commentCooldownLeft(last?.createdAt ? naiveToIso(last.createdAt) : null) > 0) {
		console.info(`[match-comments] user ${input.userId} tried to comment too fast`);
		return { ok: false, error: 'too_fast' };
	}

	// Replies hang off a visible comment of the same game.
	let parentId: number | null = null;
	if (input.parentId != null) {
		const [parent] = await db
			.select({ id: matchComments.id, parentId: matchComments.matchCommentId })
			.from(matchComments)
			.where(
				and(
					eq(matchComments.id, input.parentId),
					eq(matchComments.gameId, input.gameId),
					eq(matchComments.deleted, false)
				)
			)
			.limit(1);
		if (!parent) return { ok: false, error: 'parent_not_found' };
		// Threads are one level deep: replying to a reply joins the same thread.
		parentId = parent.parentId ?? parent.id;
	}

	const now = new Date();
	const inserted = await db.insert(matchComments).values({
		gameId: input.gameId,
		matchCommentId: parentId,
		content: valid.content,
		userId: input.userId,
		deleted: false,
		createdAt: now,
		updatedAt: now
	});

	console.info(`[match-comments] user ${input.userId} commented on game ${input.gameId}`);
	return { ok: true, id: Number(inserted[0].insertId) };
}

export type DeleteMatchCommentResult =
	{ ok: true } | { ok: false; error: 'not_found' | 'forbidden' };

/** Soft delete (`deleted = 1`), so the row and its thread stay on file. */
export async function deleteMatchComment(input: {
	gameId: number;
	commentId: number;
	userId: number;
}): Promise<DeleteMatchCommentResult> {
	const [comment] = await db
		.select({ id: matchComments.id, userId: matchComments.userId })
		.from(matchComments)
		.where(
			and(
				eq(matchComments.id, input.commentId),
				eq(matchComments.gameId, input.gameId),
				eq(matchComments.deleted, false)
			)
		)
		.limit(1);
	if (!comment) return { ok: false, error: 'not_found' };

	if (comment.userId !== input.userId && !(await isAdmin(input.userId))) {
		console.info(
			`[match-comments] user ${input.userId} tried to delete comment ${input.commentId} without permission`
		);
		return { ok: false, error: 'forbidden' };
	}

	await db
		.update(matchComments)
		.set({ deleted: true, updatedAt: new Date() })
		.where(eq(matchComments.id, comment.id));

	console.info(`[match-comments] user ${input.userId} deleted comment ${input.commentId}`);
	return { ok: true };
}

export type VoteMatchCommentResult =
	| { ok: true; score: number; myVote: CommentVote }
	| { ok: false; error: 'not_found' | 'own_comment' };

/** One vote per user and comment: +1 / -1 sets it, 0 removes it. Not on your own comment. */
export async function voteMatchComment(input: {
	gameId: number;
	commentId: number;
	userId: number;
	value: CommentVote;
}): Promise<VoteMatchCommentResult> {
	const [comment] = await db
		.select({ id: matchComments.id, userId: matchComments.userId })
		.from(matchComments)
		.where(
			and(
				eq(matchComments.id, input.commentId),
				eq(matchComments.gameId, input.gameId),
				eq(matchComments.deleted, false)
			)
		)
		.limit(1);
	if (!comment) return { ok: false, error: 'not_found' };
	if (comment.userId === input.userId) return { ok: false, error: 'own_comment' };

	if (input.value === 0) {
		await db
			.delete(matchCommentVotes)
			.where(
				and(
					eq(matchCommentVotes.matchCommentId, comment.id),
					eq(matchCommentVotes.userId, input.userId)
				)
			);
	} else {
		const now = new Date();
		await db
			.insert(matchCommentVotes)
			.values({
				matchCommentId: comment.id,
				userId: input.userId,
				value: input.value,
				createdAt: now,
				updatedAt: now
			})
			.onDuplicateKeyUpdate({ set: { value: input.value, updatedAt: now } });
	}

	const [total] = await db
		.select({ score: scoreSum })
		.from(matchCommentVotes)
		.where(eq(matchCommentVotes.matchCommentId, comment.id));

	console.info(
		`[match-comments] user ${input.userId} voted ${input.value} on comment ${comment.id}`
	);
	return { ok: true, score: total?.score ?? 0, myVote: input.value };
}
