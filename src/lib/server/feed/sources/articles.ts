import { and, desc, eq, sql } from 'drizzle-orm';
import { articleHref } from '#lib/articles.ts';
import { db } from '#lib/server/db/index.ts';
import { articles, media } from '#lib/server/db/schema.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { mediaUrl } from '#lib/server/media.ts';
import type { FeedCursor, FeedItem } from '#lib/feed.ts';
import { isBeforeCursor } from '#lib/feed.ts';

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

function excerptFrom(description: string | null, text: string): string | undefined {
	if (description?.trim()) return description.trim();
	const plain = stripHtml(text);
	if (!plain) return undefined;
	return plain.length > 270 ? `${plain.slice(0, 270)}...` : plain;
}

function coverUrl(articleId: number, thumbnailUrl: string | null): string | null {
	if (thumbnailUrl) return mediaUrl(thumbnailUrl);
	return mediaUrl(`/images/16_9_placeholder_${articleId % 10}.jpg`);
}

/** ISO → MySQL naive DATETIME string for keyset comparisons. */
export function toMysqlDatetime(iso: string): string {
	return iso.slice(0, 19).replace('T', ' ');
}

export type SourcePageArgs = {
	before: FeedCursor | null;
	limit: number;
};

/**
 * Articles sort before polls at the same timestamp. When the cursor is a poll,
 * only articles with a strictly older date belong on the next page.
 */
function articleCursorFilter(before: FeedCursor) {
	const naive = toMysqlDatetime(before.date);
	if (before.type === 'poll') {
		return sql`${articles.date} < ${naive}`;
	}
	return sql`(${articles.date} < ${naive} OR (${articles.date} = ${naive} AND ${articles.id} < ${before.id}))`;
}

export async function fetchArticlePage({ before, limit }: SourcePageArgs): Promise<FeedItem[]> {
	const rows = await db
		.select({
			id: articles.id,
			title: articles.title,
			description: articles.description,
			text: articles.text,
			date: articles.date,
			tags: articles.tags,
			thumbnailUrl: media.thumbnailUrl
		})
		.from(articles)
		.leftJoin(media, eq(articles.mediaId, media.id))
		.where(and(eq(articles.visible, true), before ? articleCursorFilter(before) : undefined))
		.orderBy(desc(articles.date), desc(articles.id))
		.limit(limit);

	const items: FeedItem[] = [];
	for (const row of rows) {
		const date = naiveToIso(row.date);
		const item: FeedItem = {
			type: 'article',
			id: row.id,
			date,
			data: {
				href: articleHref(date, row.title),
				title: row.title,
				date,
				excerpt: excerptFrom(row.description, row.text),
				image: coverUrl(row.id, row.thumbnailUrl),
				meta: row.tags?.split(',')[0]?.trim() || undefined
			}
		};
		if (before && !isBeforeCursor(item, before)) continue;
		items.push(item);
	}
	return items;
}
