import { describe, expect, it } from 'vitest';
import {
	buildCommentTree,
	commentCooldownLeft,
	countComments,
	validateComment,
	type CommentRow
} from './article-comments.ts';

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
