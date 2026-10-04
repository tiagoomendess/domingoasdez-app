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
import { fetchArticlePage } from './sources/articles.ts';
import { fetchPollPage } from './sources/polls.ts';

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
			? fetchArticlePage({ before: cursor, limit })
			: Promise.resolve([] as FeedItem[]),
		selected.has('poll')
			? fetchPollPage({
					before: cursor,
					limit,
					ctx: { hasVoted: hasVotedFromCookies(cookies), now }
				})
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
