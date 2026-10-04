import { and, asc, eq } from 'drizzle-orm';
import { prepareCmsHtml } from '#lib/server/articles/html.ts';
import { db } from '#lib/server/db/index.ts';
import { pages } from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';

export type PageListItem = {
	id: number;
	name: string;
	slug: string;
	href: string;
};

export type PageDetail = {
	id: number;
	name: string;
	title: string;
	slug: string;
	picture: string | null;
	html: string;
};

function pageHref(slug: string): string {
	return `/p/${slug}`;
}

function pictureUrl(picture: string | null | undefined): string | null {
	const trimmed = picture?.trim();
	if (!trimmed) return null;
	return mediaUrl(trimmed);
}

/** Visible CMS pages for the Páginas list, ordered like the legacy homepage. */
export async function listVisiblePages(): Promise<PageListItem[]> {
	const rows = await db
		.select({
			id: pages.id,
			name: pages.name,
			slug: pages.slug
		})
		.from(pages)
		.where(eq(pages.visible, true))
		.orderBy(asc(pages.id));

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		slug: row.slug,
		href: pageHref(row.slug)
	}));
}

/** Load a visible CMS page by slug. Hidden pages 404 (stricter than legacy). */
export async function getPageBySlug(slug: string): Promise<PageDetail | null> {
	const [row] = await db
		.select({
			id: pages.id,
			name: pages.name,
			title: pages.title,
			slug: pages.slug,
			picture: pages.picture,
			body: pages.body
		})
		.from(pages)
		.where(and(eq(pages.slug, slug), eq(pages.visible, true)))
		.limit(1);

	if (!row) return null;

	return {
		id: row.id,
		name: row.name,
		title: row.title,
		slug: row.slug,
		picture: pictureUrl(row.picture),
		html: prepareCmsHtml(row.body)
	};
}
