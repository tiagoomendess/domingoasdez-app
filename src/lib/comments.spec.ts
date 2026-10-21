import { describe, expect, it } from 'vitest';
import {
	buildCommentTree,
	commentCooldownLeft,
	countComments,
	parseCommentVote,
	sortThreads,
	validateComment,
	type CommentRow,
	type VotedCommentRow
} from './comments.ts';

function row(
	id: number,
	parentId: number | null = null,
	extra: Partial<CommentRow> = {}
): CommentRow {
	return {
		id,
		parentId,
		deleted: false,
		content: `comment ${id}`,
		authorName: 'Ana',
		authorPicture: null,
		date: '2026-10-20T10:00:00.000Z',
		canDelete: false,
		...extra
	};
}

describe('validateComment', () => {
	it('trims and accepts up to 255 characters', () => {
		expect(validateComment('  olá  ')).toEqual({ ok: true, content: 'olá' });
		expect(validateComment('a'.repeat(255)).ok).toBe(true);
		expect(validateComment('a'.repeat(256))).toEqual({ ok: false, error: 'too_long' });
	});

	it('counts emoji as one character, like Laravel', () => {
		expect(validateComment('⚽'.repeat(255)).ok).toBe(true);
	});

	it('refuses empty input', () => {
		expect(validateComment('   \n ')).toEqual({ ok: false, error: 'empty' });
		expect(validateComment(null)).toEqual({ ok: false, error: 'empty' });
	});
});

describe('commentCooldownLeft', () => {
	const now = Date.parse('2026-10-20T10:00:10.000Z');

	it('blocks a second comment within 10 seconds', () => {
		expect(commentCooldownLeft('2026-10-20T10:00:05.000Z', now)).toBe(5);
		expect(commentCooldownLeft('2026-10-20T10:00:00.000Z', now)).toBe(0);
		expect(commentCooldownLeft(null, now)).toBe(0);
	});
});

describe('buildCommentTree', () => {
	it('orders threads oldest first and nests replies', () => {
		const tree = buildCommentTree([row(3, 1), row(2), row(1)]);
		expect(tree.map((c) => c.id)).toEqual([1, 2]);
		expect(tree[0].replies.map((c) => c.id)).toEqual([3]);
		expect(countComments(tree)).toBe(3);
	});

	it('hides a deleted comment with its thread, and deleted or wiped replies', () => {
		const tree = buildCommentTree([
			row(1, null, { deleted: true }),
			row(2, 1),
			row(3),
			row(4, 3, { deleted: true }),
			row(5, 3, { content: '' })
		]);
		expect(tree.map((c) => c.id)).toEqual([3]);
		expect(tree[0].replies).toEqual([]);
	});

	it('flattens replies to replies into the top-level thread', () => {
		const tree = buildCommentTree([row(1), row(2, 1), row(3, 2)]);
		expect(tree[0].replies.map((c) => c.id)).toEqual([2, 3]);
	});

	it('drops replies whose parent is missing or forms a cycle', () => {
		const tree = buildCommentTree([row(1), row(4, 99), row(5, 6), row(6, 5)]);
		expect(tree.map((c) => c.id)).toEqual([1]);
		expect(tree[0].replies).toEqual([]);
	});
});

describe('buildCommentTree with vote fields', () => {
	it('keeps extra fields and drops the threading ones', () => {
		const rows: VotedCommentRow[] = [
			{ ...row(1), score: 3, myVote: 1, mine: false },
			{ ...row(2, 1), score: -1, myVote: 0, mine: true }
		];
		const [thread] = buildCommentTree(rows);
		expect(thread).toMatchObject({ id: 1, score: 3, myVote: 1, mine: false });
		expect(thread).not.toHaveProperty('parentId');
		expect(thread).not.toHaveProperty('deleted');
		expect(thread.replies[0]).toMatchObject({ id: 2, score: -1, mine: true });
	});
});

describe('sortThreads', () => {
	const threads = [
		{ id: 1, score: 2, replies: [{ id: 4 }, { id: 5 }] },
		{ id: 2, score: 5, replies: [] },
		{ id: 3, score: 2, replies: [] }
	];

	it('puts the most upvoted first, ties to the oldest', () => {
		expect(sortThreads(threads, 'top').map((t) => t.id)).toEqual([2, 1, 3]);
	});

	it('sorts newest and oldest first', () => {
		expect(sortThreads(threads, 'new').map((t) => t.id)).toEqual([3, 2, 1]);
		expect(sortThreads(threads, 'old').map((t) => t.id)).toEqual([1, 2, 3]);
	});

	it('keeps replies in order and leaves the input untouched', () => {
		const sorted = sortThreads(threads, 'new');
		expect(sorted[2].replies.map((r) => r.id)).toEqual([4, 5]);
		expect(threads.map((t) => t.id)).toEqual([1, 2, 3]);
	});
});

describe('parseCommentVote', () => {
	it('accepts +1, -1 and 0 only', () => {
		expect(parseCommentVote(1)).toBe(1);
		expect(parseCommentVote(-1)).toBe(-1);
		expect(parseCommentVote(0)).toBe(0);
		expect(parseCommentVote(2)).toBeNull();
		expect(parseCommentVote('1')).toBeNull();
		expect(parseCommentVote(null)).toBeNull();
	});
});
