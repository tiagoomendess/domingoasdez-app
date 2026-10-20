/** Legacy validation: `required|max:255|string` (Laravel counts characters, not bytes). */
export const COMMENT_MAX_LENGTH = 255;

/** Legacy ArticleCommentsController@comment: one comment per user every 10 seconds. */
export const COMMENT_COOLDOWN_SECONDS = 10;

/** Characters as Laravel's `max` rule counts them (code points, so emoji count once). */
export function commentLength(text: string): number {
	return [...text].length;
}

/** Laravel's TrimStrings middleware trims input; line endings are normalised for the count. */
export function normalizeComment(raw: unknown): string {
	return String(raw ?? '')
		.replace(/\r\n?/g, '\n')
		.trim();
}

export type CommentValidation =
	{ ok: true; content: string } | { ok: false; error: 'empty' | 'too_long' };

export function validateComment(raw: unknown): CommentValidation {
	const content = normalizeComment(raw);
	if (!content) return { ok: false, error: 'empty' };
	if (commentLength(content) > COMMENT_MAX_LENGTH) return { ok: false, error: 'too_long' };
	return { ok: true, content };
}

/** Seconds since the user's last comment, when that is still inside the cooldown. */
export function commentCooldownLeft(lastCommentAt: string | null, now = Date.now()): number {
	if (!lastCommentAt) return 0;
	const elapsed = (now - new Date(lastCommentAt).getTime()) / 1000;
	return elapsed < COMMENT_COOLDOWN_SECONDS ? Math.ceil(COMMENT_COOLDOWN_SECONDS - elapsed) : 0;
}

export type ArticleComment = {
	id: number;
	authorName: string;
	authorPicture: string | null;
	content: string;
	date: string;
	canDelete: boolean;
	replies: ArticleComment[];
};

export type CommentRow = Omit<ArticleComment, 'replies'> & {
	parentId: number | null;
	deleted: boolean;
};

/**
 * Ports Api\ArticleCommentsController@get: top-level comments that aren't deleted, oldest
 * first, each with its replies. A deleted top-level comment hides its whole thread, as on the
 * legacy site. Unlike the legacy site, deleted replies are hidden too, and so are comments
 * whose content was wiped by an account deletion.
 *
 * Threads are one level deep: a reply to a reply (the legacy table allows it) is shown under
 * the top-level comment it descends from.
 */
export function buildCommentTree(rows: CommentRow[]): ArticleComment[] {
	const visible = rows
		.filter((row) => !row.deleted && row.content.trim())
		.sort((a, b) => a.id - b.id);
	const rowById = new Map(visible.map((row) => [row.id, row]));
	const roots = new Map<number, ArticleComment>();

	const toComment = (row: CommentRow): ArticleComment => ({
		id: row.id,
		authorName: row.authorName,
		authorPicture: row.authorPicture,
		content: row.content,
		date: row.date,
		canDelete: row.canDelete,
		replies: []
	});

	for (const row of visible) {
		if (row.parentId == null) {
			roots.set(row.id, toComment(row));
			continue;
		}
		// Walk up to the top-level comment; a hidden ancestor hides the reply.
		// Parents always have lower ids, which also stops a corrupt cycle from looping forever.
		let ancestor = rowById.get(row.parentId);
		while (ancestor?.parentId != null && ancestor.parentId < ancestor.id) {
			ancestor = rowById.get(ancestor.parentId);
		}
		if (ancestor) roots.get(ancestor.id)?.replies.push(toComment(row));
	}
	return [...roots.values()];
}

export function countComments(comments: ArticleComment[]): number {
	return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}
