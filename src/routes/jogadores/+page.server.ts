import { desc, eq, sql } from 'drizzle-orm';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { db } from '#lib/server/db/index.ts';
import { players } from '#lib/server/db/schema.ts';
import { profilePicture } from '#lib/server/media.ts';
import { playerHref } from '#lib/clubs.ts';
import { m } from '#lib/messages.ts';
import { isAdult, playerDisplayName } from '#lib/players.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

function parsePage(raw: string | null): number {
	const page = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(page) || page < 1) return 1;
	return page;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const requestedPage = parsePage(url.searchParams.get('page'));

	const [{ count: total }] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(players)
		.where(eq(players.visible, true));

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);

	const perms = locals.user ? await getUserPermissionNames(locals.user.id) : new Set<string>();
	const canSeeUnderagePics = hasPermission(perms, 'players');

	const rows = await db
		.select({
			id: players.id,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			birthDate: players.birthDate
		})
		.from(players)
		.where(eq(players.visible, true))
		.orderBy(desc(players.id))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);

	return {
		players: rows.map((row) => {
			const showPic = canSeeUnderagePics || isAdult(row.birthDate);
			return {
				id: row.id,
				name: playerDisplayName(row.name, row.nickname),
				picture: profilePicture(showPic ? row.picture : null),
				href: playerHref(row.id, row.name)
			};
		}),
		page,
		totalPages,
		total,
		seo: {
			title: m.players_index_title(),
			description: m.players_index_meta_description()
		}
	};
};
