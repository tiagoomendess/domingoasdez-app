import { desc, eq, sql } from 'drizzle-orm';
import { clubHref } from '#lib/clubs.ts';
import { m } from '#lib/messages.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs } from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

function parsePage(raw: string | null): number {
	const page = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(page) || page < 1) return 1;
	return page;
}

export const load: PageServerLoad = async ({ url }) => {
	const requestedPage = parsePage(url.searchParams.get('page'));

	const [{ count: total }] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(clubs)
		.where(eq(clubs.visible, true));

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);

	const rows = await db
		.select({ id: clubs.id, name: clubs.name, emblem: clubs.emblem })
		.from(clubs)
		.where(eq(clubs.visible, true))
		.orderBy(desc(clubs.id))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);

	return {
		clubs: rows.map((row) => ({
			id: row.id,
			name: row.name,
			emblem: emblemUrl(row.emblem),
			href: clubHref(row.name)
		})),
		page,
		totalPages,
		total,
		seo: {
			title: m.clubs_index_title(),
			description: m.clubs_index_meta_description()
		}
	};
};
