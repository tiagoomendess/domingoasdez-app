/**
 * Pure transfer helpers shared by the server loaders, the feed and the transfers page.
 *
 * A transfer "day" is the UTC calendar date of `transfers.date`. The backoffice stores a
 * date-picker value at midnight UTC and the legacy site prints that date, so grouping by
 * the UTC date matches what admins entered.
 */
import { addDays } from '#lib/format.ts';

/** Transfers shown in a feed card before the "see all" slide takes the next place. */
export const TRANSFER_FEED_PREVIEW = 5;

export type TransferView = {
	id: number;
	playerName: string;
	picture: string;
	href: string | null;
	fromLabel: string;
	fromHref: string | null;
	fromEmblem: string | null;
	toLabel: string;
	toHref: string | null;
	toEmblem: string | null;
	date: string;
	editHref: string | null;
};

export function transfersHref(day: string): string {
	return `/transferencias?date=${day}`;
}

/** Numeric feed id for a day: `2026-09-02` → `20260902`. */
export function transferDayId(day: string): number {
	return Number(day.replaceAll('-', ''));
}

/** Feed sort instant for a day group: its midnight, so it follows that day's posts. */
export function transferDayInstant(day: string): string {
	return `${day}T00:00:00.000Z`;
}

/** Naive UTC `[start, end)` bounds for one transfer day, for SQL comparisons. */
export function transferDayRange(day: string): { startNaive: string; endNaive: string } {
	return { startNaive: `${day} 00:00:00`, endNaive: `${addDays(day, 1)} 00:00:00` };
}

/**
 * First day (exclusive) the next feed page may contain, given the last item already shown.
 * A transfer cursor means that day is done. Any other cursor at instant X means X's own day
 * is still to come, because a day group sorts after posts at the same instant.
 */
export function transferDayBound(cursor: { type: string; date: string } | null): string | null {
	if (!cursor) return null;
	const day = cursor.date.slice(0, 10);
	return cursor.type === 'transfer' ? day : addDays(day, 1);
}

/**
 * Ports Transfer::getPreviousTransfer: the player's latest transfer dated strictly before
 * `date`, ignoring `visible`. Same-date ties keep the higher id, like the old list order.
 * Dates must share one format (ISO strings) so they compare as text.
 */
export function pickPreviousTransfer<T extends { id: number; date: string }>(
	history: readonly T[],
	date: string
): T | null {
	let best: T | null = null;
	for (const row of history) {
		if (row.date >= date) continue;
		if (!best || row.date > best.date || (row.date === best.date && row.id > best.id)) {
			best = row;
		}
	}
	return best;
}
