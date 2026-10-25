import type { Cookies } from '@sveltejs/kit';
import {
	ALL_FEED_TYPES,
	FEED_PAGE_SIZE,
	compareFeedItems,
	encodeCursor,
	type FeedCursor,
	type FeedItem,
	type FeedType
} from '#lib/feed.ts';
import { getLocale } from '#lib/messages.ts';
import { swrCache } from '#lib/server/cache.ts';
import { transferDayBound } from '#lib/transfers.ts';
import { fetchArticlePage } from './sources/articles.ts';
import { fetchPollPage } from './sources/polls.ts';
import { fetchTransferPage } from './sources/transfers.ts';

/**
 * Articles and transfers are the same for every visitor, so they come from a short cache and
 * show admin changes up to a minute late. Polls stay live: their state depends on the visitor's
 * vote cookie and the clock.
 */
const FEED_CACHE = { freshMs: 60_000, staleMs: 5 * 60_000, maxEntries: 200 };
const articleCache = swrCache<FeedItem[]>('feed articles', FEED_CACHE);
const transferCache = swrCache<FeedItem[]>('feed transfers', FEED_CACHE);

export type GetFeedPageArgs = {
	types?: FeedType[];
	cursor?: FeedCursor | null;
	/** Cookies from the request — used for legacy `poll{id}` vote cookies. */
	cookies?: Cookies;
	limit?: number;
	now?: string;
};

export type FeedPage = {
	items: FeedItem[];
	nextCursor: string | null;
};

function hasVotedFromCookies(cookies: Cookies | undefined) {
	return (pollId: number) => {
		if (!cookies) return false;
		return Boolean(cookies.get(`poll${pollId}`));
	};
}

/**
 * Mixed feed page: fetch each selected source, merge-sort by date, take `limit`.
 * Future content types: add a source fetch + a branch here + a registry entry.
 */
export async function getFeedPage({
	types = ALL_FEED_TYPES,
	cursor = null,
	cookies,
	limit = FEED_PAGE_SIZE,
	now
}: GetFeedPageArgs): Promise<FeedPage> {
	const selected = new Set(types.length ? types : ALL_FEED_TYPES);
	const batches: FeedItem[][] = await Promise.all([
		selected.has('article')
			? articleCache.get(`${limit}|${cursor ? encodeCursor(cursor) : ''}`, () =>
					fetchArticlePage({ before: cursor, limit })
				)
			: Promise.resolve([] as FeedItem[]),
		selected.has('poll')
			? fetchPollPage({
					before: cursor,
					limit,
					ctx: { hasVoted: hasVotedFromCookies(cookies), now }
				})
			: Promise.resolve([] as FeedItem[]),
		selected.has('transfer')
			? // The page only depends on the cursor's day; the "no team" label is translated.
				transferCache.get(`${getLocale()}|${limit}|${transferDayBound(cursor) ?? ''}`, () =>
					fetchTransferPage({ before: cursor, limit })
				)
			: Promise.resolve([] as FeedItem[])
	]);

	const merged = batches.flat().sort(compareFeedItems);
	const items = merged.slice(0, limit);
	const last = items.at(-1);
	const nextCursor =
		items.length === limit && last
			? encodeCursor({ date: last.date, type: last.type, id: last.id })
			: null;

	return { items, nextCursor };
}

export { pollState, pollClosed } from './pollState.ts';
