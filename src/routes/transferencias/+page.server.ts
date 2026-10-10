import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { clubHref, playerHref } from '#lib/clubs.ts';
import { m } from '#lib/messages.ts';
import { isAdult, playerDisplayName } from '#lib/players.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, players, teams, transfers } from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { profilePicture } from '#lib/server/media.ts';
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
		.from(transfers)
		.where(eq(transfers.visible, true));

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);

	const seo = {
		title: m.transfers_title(),
		description: m.transfers_meta_description()
	};

	// Legacy login wall: guests only see page 1.
	if (!locals.user && page > 1) {
		return { transfers: [], page, totalPages, total, showLoginWall: true, seo };
	}

	const perms = locals.user ? await getUserPermissionNames(locals.user.id) : new Set<string>();
	const canSeeUnderagePics = hasPermission(perms, 'players');
	const canEditTransfers = hasPermission(perms, 'transfers.edit');

	const rows = await db
		.select({
			id: transfers.id,
			playerId: transfers.playerId,
			teamId: transfers.teamId,
			date: transfers.date
		})
		.from(transfers)
		.where(eq(transfers.visible, true))
		.orderBy(desc(transfers.date), desc(transfers.id))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);

	if (rows.length === 0) {
		return { transfers: [], page, totalPages, total, showLoginWall: false, seo };
	}

	const playerIds = [...new Set(rows.map((r) => r.playerId))];
	const playerRows = await db
		.select({
			id: players.id,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			birthDate: players.birthDate
		})
		.from(players)
		.where(inArray(players.id, playerIds));
	const playerById = new Map(playerRows.map((p) => [p.id, p]));

	// Previous transfer per row (most recent transfer before this date).
	const prevLookups = await Promise.all(
		rows.map(async (row) => {
			const [prev] = await db
				.select({ id: transfers.id, teamId: transfers.teamId, date: transfers.date })
				.from(transfers)
				.where(and(eq(transfers.playerId, row.playerId), lt(transfers.date, row.date)))
				.orderBy(desc(transfers.date), desc(transfers.id))
				.limit(1);
			return { forId: row.id, prev: prev ?? null };
		})
	);
	const prevByTransferId = new Map(prevLookups.map((p) => [p.forId, p.prev]));

	const teamIds = [
		...new Set(
			[...rows.map((r) => r.teamId), ...prevLookups.map((p) => p.prev?.teamId)].filter(
				(id): id is number => id != null
			)
		)
	];

	const teamById = new Map<number, { name: string; clubId: number | null }>();
	const clubById = new Map<number, { name: string; emblem: string | null }>();
	if (teamIds.length > 0) {
		const teamRows = await db
			.select({ id: teams.id, name: teams.name, clubId: teams.clubId })
			.from(teams)
			.where(inArray(teams.id, teamIds));
		for (const t of teamRows) teamById.set(t.id, { name: t.name, clubId: t.clubId });

		const clubIds = [
			...new Set(teamRows.map((t) => t.clubId).filter((id): id is number => id != null))
		];
		if (clubIds.length > 0) {
			const clubRows = await db
				.select({ id: clubs.id, name: clubs.name, emblem: clubs.emblem })
				.from(clubs)
				.where(inArray(clubs.id, clubIds));
			for (const c of clubRows) clubById.set(c.id, { name: c.name, emblem: c.emblem });
		}
	}

	const noneLabel = m.club_transfer_no_team();

	const transferViews = rows.map((row) => {
		const player = playerById.get(row.playerId);
		const playerName = player
			? playerDisplayName(player.name, player.nickname)
			: `#${row.playerId}`;
		const showPic = player ? canSeeUnderagePics || isAdult(player.birthDate) : false;

		const team = row.teamId != null ? teamById.get(row.teamId) : undefined;
		const club = team?.clubId != null ? clubById.get(team.clubId) : undefined;
		const toLabel = team && club ? `${club.name} (${team.name})` : noneLabel;

		const prev = prevByTransferId.get(row.id);
		const prevTeam = prev?.teamId != null ? teamById.get(prev.teamId) : undefined;
		const prevClub = prevTeam?.clubId != null ? clubById.get(prevTeam.clubId) : undefined;
		const fromLabel = prevTeam && prevClub ? `${prevClub.name} (${prevTeam.name})` : noneLabel;

		return {
			id: row.id,
			playerName,
			picture: profilePicture(showPic && player?.picture ? player.picture : null),
			href: player ? playerHref(player.id, player.name) : null,
			fromLabel,
			fromHref: prevClub ? clubHref(prevClub.name) : null,
			fromEmblem: emblemUrl(prevClub?.emblem),
			toLabel,
			toHref: club ? clubHref(club.name) : null,
			toEmblem: emblemUrl(club?.emblem),
			date: naiveToIso(row.date),
			editHref: canEditTransfers ? legacyUrl(`/transfers/${row.id}`) : null
		};
	});

	return { transfers: transferViews, page, totalPages, total, showLoginWall: false, seo };
};
