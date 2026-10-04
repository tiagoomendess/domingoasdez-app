import type { PollAnswer, PollState } from '#lib/components/types.ts';

/** Internal feed type keys (stable across locales). */
export type FeedType = 'article' | 'poll';

/** Values used in `?tipos=` — Portuguese, matching the UI labels. */
export type FeedTypeParam = 'artigos' | 'sondagens';

export const FEED_TYPE_PARAMS: Record<FeedType, FeedTypeParam> = {
	article: 'artigos',
	poll: 'sondagens'
};

export const FEED_PARAM_TO_TYPE: Record<FeedTypeParam, FeedType> = {
	artigos: 'article',
	sondagens: 'poll'
};

export const ALL_FEED_TYPES: FeedType[] = ['article', 'poll'];

export type ArticleCardData = {
	href: string;
	title: string;
	date: string;
	excerpt?: string;
	image?: string | null;
	meta?: string;
};

export type PollCardData = {
	href: string;
	question: string;
	state: PollState;
	answers: PollAnswer[];
	closed?: boolean;
	endsAt?: string;
	resultsAt?: string;
};

export type FeedItem =
	| { type: 'article'; id: number; date: string; data: ArticleCardData }
	| { type: 'poll'; id: number; date: string; data: PollCardData };

/** Cursor for keyset pagination: date + type + id of the last item. */
export type FeedCursor = {
	date: string;
	type: FeedType;
	id: number;
};

export const FEED_PAGE_SIZE = 12;

export function encodeCursor(cursor: FeedCursor): string {
	return `${cursor.date}|${cursor.type}|${cursor.id}`;
}

export function decodeCursor(raw: string | null | undefined): FeedCursor | null {
	if (!raw) return null;
	const [date, type, idRaw] = raw.split('|');
	if (!date || (type !== 'article' && type !== 'poll')) return null;
	const id = Number(idRaw);
	if (!Number.isFinite(id)) return null;
	return { date, type, id };
}

/** Parse `?tipos=artigos,sondagens`. Missing or empty → all types. Invalid tokens ignored. */
export function parseTipos(raw: string | null | undefined): FeedType[] {
	if (!raw?.trim()) return [...ALL_FEED_TYPES];
	const seen = new Set<FeedType>();
	for (const token of raw.split(',')) {
		const key = token.trim() as FeedTypeParam;
		const type = FEED_PARAM_TO_TYPE[key];
		if (type) seen.add(type);
	}
	return seen.size > 0 ? ALL_FEED_TYPES.filter((t) => seen.has(t)) : [...ALL_FEED_TYPES];
}

export function tiposQuery(types: FeedType[]): string {
	return types.map((t) => FEED_TYPE_PARAMS[t]).join(',');
}

type FeedKey = { date: string; type: FeedType; id: number };

/** Stable ordering: date desc, then type name, then id desc. */
export function compareFeedKeys(a: FeedKey, b: FeedKey): number {
	if (a.date !== b.date) return a.date < b.date ? 1 : -1;
	if (a.type !== b.type) return a.type < b.type ? -1 : 1;
	return b.id - a.id;
}

export function compareFeedItems(a: FeedItem, b: FeedItem): number {
	return compareFeedKeys(a, b);
}

/** True if `item` is strictly older than `cursor` under {@link compareFeedKeys}. */
export function isBeforeCursor(item: FeedKey, cursor: FeedCursor): boolean {
	return compareFeedKeys(item, cursor) > 0;
}
