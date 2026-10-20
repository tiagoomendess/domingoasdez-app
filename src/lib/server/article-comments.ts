/**
 * Article comments. Ports Front\ArticleCommentsController (comment, delete) and
 * Api\ArticleCommentsController@get from the legacy site, on the same `article_comments` table.
 */
import { and, desc, eq } from 'drizzle-orm';
import {
	buildCommentTree,
	commentCooldownLeft,
	validateComment,
	type ArticleComment
} from '#lib/article-comments.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { db } from '#lib/server/db/index.ts';
import { articleComments, userProfiles, users } from '#lib/server/db/schema.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { mediaUrl } from '#lib/server/media.ts';

/** Legacy delete rule: `has_permission('admin')`, or the comment's own author. */
async function isAdmin(userId: number) {
	return hasPermission(await getUserPermissionNames(userId), 'admin');
}

export async function listArticleComments(
	articleId: number,
	viewerId: number | null
): Promise<ArticleComment[]> {
	const [rows, admin] = await Promise.all([
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
		viewerId == null ? false : isAdmin(viewerId)
	]);

	return buildCommentTree(
		rows.map((row) => ({
			id: row.id,
			parentId: row.parentId,
			deleted: row.deleted,
			content: row.content ?? '',
			// Same fallback as the signed-in user's name (toAuthUser).
			authorName: row.name?.trim() || row.email?.split('@')[0] || 'Utilizador',
			authorPicture: mediaUrl(row.picture),
			date: row.createdAt ? naiveToIso(row.createdAt) : new Date(0).toISOString(),
			canDelete: viewerId != null && (admin || row.userId === viewerId)
		}))
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
		console.info(`[article-comments] user ${input.userId} tried to comment too fast`);
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

	console.info(`[article-comments] user ${input.userId} commented on article ${input.articleId}`);
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
		console.info(
			`[article-comments] user ${input.userId} tried to delete comment ${input.commentId} without permission`
		);
		return { ok: false, error: 'forbidden' };
	}

	await db
		.update(articleComments)
		.set({ deleted: true, updatedAt: new Date() })
		.where(eq(articleComments.id, comment.id));

	console.info(`[article-comments] user ${input.userId} deleted comment ${input.commentId}`);
	return { ok: true };
}
