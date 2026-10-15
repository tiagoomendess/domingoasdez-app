import { sql, type SQL } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import { sortsAfterAtSameDate, type FeedCursor, type FeedType } from '#lib/feed.ts';

/** ISO → MySQL naive DATETIME string for keyset comparisons. */
export function toMysqlDatetime(iso: string): string {
	return iso.slice(0, 19).replace('T', ' ');
}

/**
 * Rows of `type` that come after `before` in feed order (date desc, then type, then id desc).
 * At the cursor's own date, a type that sorts after the cursor's type still has every row to
 * show; one that sorts before it has none left.
 */
export function keysetFilter(
	date: MySqlColumn,
	id: MySqlColumn,
	type: FeedType,
	before: FeedCursor
): SQL {
	const naive = toMysqlDatetime(before.date);
	if (before.type === type) {
		return sql`(${date} < ${naive} OR (${date} = ${naive} AND ${id} < ${before.id}))`;
	}
	if (sortsAfterAtSameDate(type, before.type)) {
		return sql`${date} <= ${naive}`;
	}
	return sql`${date} < ${naive}`;
}
