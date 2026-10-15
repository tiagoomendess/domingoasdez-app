import type { FeedCursor, FeedItem } from '#lib/feed.ts';
import { fetchTransferDayGroups } from '#lib/server/transfers.ts';
import {
	TRANSFER_FEED_PREVIEW,
	transferDayBound,
	transferDayId,
	transferDayInstant,
	transfersHref
} from '#lib/transfers.ts';

export type TransferSourcePageArgs = {
	before: FeedCursor | null;
	limit: number;
};

/**
 * One feed item per day with transfers, so a busy transfer window can't flood the feed.
 * Each card carries the day's first transfers and, when there are more, a link to that day.
 */
export async function fetchTransferPage({
	before,
	limit
}: TransferSourcePageArgs): Promise<FeedItem[]> {
	const groups = await fetchTransferDayGroups({ beforeDay: transferDayBound(before), limit });

	return groups.map(({ day, total, transfers }) => ({
		type: 'transfer',
		id: transferDayId(day),
		date: transferDayInstant(day),
		data: {
			day,
			total,
			transfers,
			moreHref: total > TRANSFER_FEED_PREVIEW ? transfersHref(day) : null
		}
	}));
}
