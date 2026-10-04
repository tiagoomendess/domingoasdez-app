import { describe, expect, it } from 'vitest';
import {
	ALL_FEED_TYPES,
	compareFeedItems,
	decodeCursor,
	encodeCursor,
	isBeforeCursor,
	parseTipos,
	tiposQuery,
	type FeedItem
} from './feed.ts';

function article(id: number, date: string): FeedItem {
	return {
		type: 'article',
		id,
		date,
		data: { href: '/', title: `A${id}`, date }
	};
}

function poll(id: number, date: string): FeedItem {
	return {
		type: 'poll',
		id,
		date,
		data: { href: '/', question: `P${id}`, state: 'open', answers: [] }
	};
}

describe('parseTipos / tiposQuery', () => {
	it('defaults to all types', () => {
		expect(parseTipos(null)).toEqual(ALL_FEED_TYPES);
		expect(parseTipos('')).toEqual(ALL_FEED_TYPES);
		expect(parseTipos('nope')).toEqual(ALL_FEED_TYPES);
	});

	it('parses known tokens and preserves canonical order', () => {
		expect(parseTipos('sondagens')).toEqual(['poll']);
		expect(parseTipos('sondagens,artigos')).toEqual(['article', 'poll']);
	});

	it('round-trips query encoding', () => {
		expect(tiposQuery(['article', 'poll'])).toBe('artigos,sondagens');
		expect(parseTipos(tiposQuery(['poll']))).toEqual(['poll']);
	});
});

describe('cursor encode/decode', () => {
	it('round-trips', () => {
		const cursor = { date: '2026-01-02T03:04:05.000Z', type: 'article' as const, id: 9 };
		expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
	});

	it('rejects garbage', () => {
		expect(decodeCursor('nope')).toBeNull();
		expect(decodeCursor('2026-01-01|nope|1')).toBeNull();
	});
});

describe('feed merge ordering', () => {
	it('orders by date desc, then article before poll, then id desc', () => {
		const items = [
			poll(1, '2026-01-01T10:00:00.000Z'),
			article(2, '2026-01-01T10:00:00.000Z'),
			article(1, '2026-01-01T10:00:00.000Z'),
			article(3, '2026-01-02T10:00:00.000Z')
		].sort(compareFeedItems);

		expect(items.map((i) => `${i.type}:${i.id}`)).toEqual([
			'article:3',
			'article:2',
			'article:1',
			'poll:1'
		]);
	});

	it('isBeforeCursor skips items already shown', () => {
		const cursor = { date: '2026-01-01T10:00:00.000Z', type: 'article' as const, id: 2 };
		expect(isBeforeCursor(article(1, '2026-01-01T10:00:00.000Z'), cursor)).toBe(true);
		expect(isBeforeCursor(article(2, '2026-01-01T10:00:00.000Z'), cursor)).toBe(false);
		expect(isBeforeCursor(poll(9, '2026-01-01T10:00:00.000Z'), cursor)).toBe(true);
		expect(isBeforeCursor(article(9, '2026-01-02T10:00:00.000Z'), cursor)).toBe(false);
	});

	it('paginates without duplicates or gaps across a mixed list', () => {
		const all = [
			article(10, '2026-03-10T12:00:00.000Z'),
			poll(5, '2026-03-10T12:00:00.000Z'),
			article(9, '2026-03-09T12:00:00.000Z'),
			poll(4, '2026-03-09T08:00:00.000Z'),
			article(8, '2026-03-08T12:00:00.000Z'),
			article(7, '2026-03-07T12:00:00.000Z'),
			poll(3, '2026-03-07T12:00:00.000Z'),
			article(6, '2026-03-06T12:00:00.000Z')
		].sort(compareFeedItems);

		const pageSize = 3;
		const pages: FeedItem[][] = [];
		let cursor: { date: string; type: 'article' | 'poll'; id: number } | null = null;

		for (;;) {
			const page = all.filter((item) => !cursor || isBeforeCursor(item, cursor)).slice(0, pageSize);
			if (page.length === 0) break;
			pages.push(page);
			const last = page.at(-1)!;
			cursor = { date: last.date, type: last.type, id: last.id };
			if (page.length < pageSize) break;
		}

		const flat = pages.flat();
		expect(flat).toEqual(all);
		expect(new Set(flat.map((i) => `${i.type}:${i.id}`)).size).toBe(all.length);
	});
});
