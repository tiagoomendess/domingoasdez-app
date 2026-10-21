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

/** A comment as the page shows it (article and match comments alike). */
export type CommentData = {
	id: number;
	authorName: string;
	authorPicture: string | null;
	content: string;
	date: string;
	canDelete: boolean;
	replies: CommentData[];
};

/** Any threaded comment whose replies are of its own type (what the comment components take). */
export type CommentNode<T> = Omit<CommentData, 'replies'> & { replies: T[] };

/** A row as the server reads it, before threading. Extra fields pass through to the tree. */
export type CommentRow = Omit<CommentData, 'replies'> & {
	parentId: number | null;
	deleted: boolean;
};

export type CommentTree<T extends CommentRow> = Omit<T, 'parentId' | 'deleted'> & {
	replies: CommentTree<T>[];
};

/** -1 down, 0 none, +1 up. */
export type CommentVote = -1 | 0 | 1;

export type VotedCommentRow = CommentRow & {
	/** Sum of the votes (+1 / -1). */
	score: number;
	/** The viewer's own vote. */
	myVote: CommentVote;
	/** Written by the viewer, who can't vote on it. */
	mine: boolean;
};

export type VotedComment = CommentTree<VotedCommentRow>;

/**
 * Ports Api\ArticleCommentsController@get: top-level comments that aren't deleted, oldest
 * first, each with its replies. A deleted top-level comment hides its whole thread, as on the
 * legacy site. Unlike the legacy site, deleted replies are hidden too, and so are comments
 * whose content was wiped by an account deletion.
 *
 * Threads are one level deep: a reply to a reply (the legacy table allows it) is shown under
 * the top-level comment it descends from.
 */
export function buildCommentTree<T extends CommentRow>(rows: T[]): CommentTree<T>[] {
	const visible = rows
		.filter((row) => !row.deleted && row.content.trim())
		.sort((a, b) => a.id - b.id);
	const rowById = new Map(visible.map((row) => [row.id, row]));
	const roots = new Map<number, CommentTree<T>>();

	const toComment = (row: T): CommentTree<T> => {
		const comment: CommentTree<T> & Partial<Pick<CommentRow, 'parentId' | 'deleted'>> = {
			...row,
			replies: []
		};
		delete comment.parentId;
		delete comment.deleted;
		return comment;
	};

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

type Threaded = { replies: Threaded[] };

export function countComments(comments: Threaded[]): number {
	return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

export const COMMENT_SORTS = ['top', 'new', 'old'] as const;
export type CommentSort = (typeof COMMENT_SORTS)[number];

/**
 * Orders comment threads: most upvoted (ties go to the oldest), newest or oldest first.
 * Replies keep their oldest-first order, so a conversation always reads top to bottom.
 */
export function sortThreads<T extends { id: number; score: number }>(
	threads: T[],
	order: CommentSort
): T[] {
	const sorted = [...threads];
	switch (order) {
		case 'top':
			return sorted.sort((a, b) => b.score - a.score || a.id - b.id);
		case 'new':
			return sorted.sort((a, b) => b.id - a.id);
		case 'old':
			return sorted.sort((a, b) => a.id - b.id);
	}
}

/** A vote as the vote endpoint accepts it: +1, -1, or 0 to remove it. */
export function parseCommentVote(value: unknown): CommentVote | null {
	return value === 1 || value === -1 || value === 0 ? value : null;
}
