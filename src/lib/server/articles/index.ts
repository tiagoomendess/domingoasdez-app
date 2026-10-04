import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { articles, media } from '#lib/server/db/schema.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { slugify } from '#lib/slug.ts';
import { articleHref, parseArticlePathParams, youtubeIdFromUrl } from '#lib/articles.ts';
import { prepareArticleHtml } from './html.ts';

export type ArticleMediaType = 'image' | 'video' | 'youtube' | 'download' | 'other' | 'none';

export type ArticleMedia = {
	type: ArticleMediaType;
	url: string | null;
	thumbnailUrl: string | null;
	youtubeId: string | null;
};

export type ArticleDetail = {
	id: number;
	title: string;
	description: string | null;
	date: string;
	tags: string | null;
	html: string;
	href: string;
	media: ArticleMedia | null;
};

function mapMedia(
	row: {
		mediaType: ArticleMediaType | null;
		mediaUrl: string | null;
		thumbnailUrl: string | null;
	} | null
): ArticleMedia | null {
	if (!row?.mediaType || row.mediaType === 'none') return null;

	const url = mediaUrl(row.mediaUrl);
	const thumbnailUrl = mediaUrl(row.thumbnailUrl);
	const youtubeId =
		row.mediaType === 'youtube' && row.mediaUrl ? youtubeIdFromUrl(row.mediaUrl) : null;

	if (row.mediaType === 'youtube' && !youtubeId) return null;
	if ((row.mediaType === 'image' || row.mediaType === 'video') && !url) return null;

	return {
		type: row.mediaType,
		url,
		thumbnailUrl,
		youtubeId
	};
}

export async function getArticleByPath(params: {
	year: string;
	month: string;
	day: string;
	slug: string;
}): Promise<ArticleDetail | null> {
	const path = parseArticlePathParams(params);
	if (!path) return null;

	const rows = await db
		.select({
			id: articles.id,
			title: articles.title,
			description: articles.description,
			text: articles.text,
			date: articles.date,
			tags: articles.tags,
			mediaType: media.mediaType,
			mediaUrl: media.url,
			thumbnailUrl: media.thumbnailUrl
		})
		.from(articles)
		.leftJoin(media, eq(articles.mediaId, media.id))
		.where(
			and(
				eq(articles.visible, true),
				sql`${articles.date} >= ${path.dayStart}`,
				sql`${articles.date} < ${path.dayEnd}`
			)
		)
		.orderBy(desc(articles.id));

	const match = rows.find((row) => slugify(row.title) === params.slug);
	if (!match) return null;

	const date = naiveToIso(match.date);

	return {
		id: match.id,
		title: match.title,
		description: match.description,
		date,
		tags: match.tags,
		html: prepareArticleHtml(match.text),
		href: articleHref(date, match.title),
		media: mapMedia({
			mediaType: match.mediaType,
			mediaUrl: match.mediaUrl,
			thumbnailUrl: match.thumbnailUrl
		})
	};
}

export { articleHref, prepareArticleHtml };
