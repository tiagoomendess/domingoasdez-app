import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { clubHref, playerHref } from '#lib/clubs.ts';
import { m } from '#lib/messages.ts';
import { isAdult, playerDisplayName } from '#lib/players.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, players, teams, transfers } from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { profilePicture } from '#lib/server/media.ts';
import {
	TRANSFER_FEED_PREVIEW,
	pickPreviousTransfer,
	transferDayRange,
	type TransferView
} from '#lib/transfers.ts';

type TransferRow = { id: number; playerId: number; teamId: number | null; date: string | Date };

export type TransferViewOptions = {
	/** `players` permission: show pictures of under-18 players too. */
	canSeeUnderagePics?: boolean;
	/** `transfers.edit` permission: link each transfer to the legacy backoffice. */
	canEdit?: boolean;
};

export type TransferDayGroup = {
	day: string;
	total: number;
	transfers: TransferView[];
};

const rowColumns = {
	id: transfers.id,
	playerId: transfers.playerId,
	teamId: transfers.teamId,
	date: transfers.date
};

const dayOf = sql<string>`DATE(${transfers.date})`;

/**
 * Only real moves are published. The backoffice never checked for repeats, so some rows move
 * a player to the team they were already in, or from no team to no team. "Previous" follows
 * Transfer::getPreviousTransfer (latest earlier transfer, ignoring `visible`), and having no
 * previous transfer counts as no team. Repeats stay in the database until a data fix lands.
 */
const changesTeam = sql`NOT (${transfers.teamId} <=> (
	SELECT previous.team_id FROM transfers AS previous
	WHERE previous.player_id = ${transfers.playerId} AND previous.date < ${transfers.date}
	ORDER BY previous.date DESC, previous.id DESC
	LIMIT 1
))`;

const published = and(eq(transfers.visible, true), changesTeam);

function onDay(day: string) {
	const { startNaive, endNaive } = transferDayRange(day);
	return and(sql`${transfers.date} >= ${startNaive}`, sql`${transfers.date} < ${endNaive}`);
}

/** `YYYY-MM-DD` from a MySQL DATE value, whatever shape the driver returns. */
function toDay(value: string | Date | null | undefined): string | null {
	if (value == null) return null;
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value).slice(0, 10) || null;
}

/**
 * Display rows for transfers, newest first as given. Loads players, every transfer of those
 * players (to find each one's previous club), and the teams and clubs involved, in batches.
 */
export async function buildTransferViews(
	rows: TransferRow[],
	{ canSeeUnderagePics = false, canEdit = false }: TransferViewOptions = {}
): Promise<TransferView[]> {
	if (rows.length === 0) return [];

	const playerIds = [...new Set(rows.map((row) => row.playerId))];
	const [playerRows, historyRows] = await Promise.all([
		db
			.select({
				id: players.id,
				name: players.name,
				nickname: players.nickname,
				picture: players.picture,
				birthDate: players.birthDate
			})
			.from(players)
			.where(inArray(players.id, playerIds)),
		db.select(rowColumns).from(transfers).where(inArray(transfers.playerId, playerIds))
	]);
	const playerById = new Map(playerRows.map((player) => [player.id, player]));

	const historyByPlayer = new Map<number, { id: number; teamId: number | null; date: string }[]>();
	for (const row of historyRows) {
		const list = historyByPlayer.get(row.playerId) ?? [];
		list.push({ id: row.id, teamId: row.teamId, date: naiveToIso(row.date) });
		historyByPlayer.set(row.playerId, list);
	}

	const previousById = new Map(
		rows.map((row) => [
			row.id,
			pickPreviousTransfer(historyByPlayer.get(row.playerId) ?? [], naiveToIso(row.date))
		])
	);

	const teamIds = [
		...new Set(
			[
				...rows.map((row) => row.teamId),
				...[...previousById.values()].map((prev) => prev?.teamId)
			].filter((id): id is number => id != null)
		)
	];
	const teamById = new Map<number, { team: string; club: string; emblem: string | null }>();
	if (teamIds.length > 0) {
		const teamRows = await db
			.select({ id: teams.id, team: teams.name, club: clubs.name, emblem: clubs.emblem })
			.from(teams)
			.innerJoin(clubs, eq(teams.clubId, clubs.id))
			.where(inArray(teams.id, teamIds));
		for (const row of teamRows) teamById.set(row.id, row);
	}

	const noneLabel = m.club_transfer_no_team();
	const side = (teamId: number | null | undefined) => {
		const team = teamId != null ? teamById.get(teamId) : undefined;
		return {
			label: team ? `${team.club} (${team.team})` : noneLabel,
			href: team ? clubHref(team.club) : null,
			emblem: emblemUrl(team?.emblem)
		};
	};

	return rows.map((row) => {
		const player = playerById.get(row.playerId);
		const showPicture = player ? canSeeUnderagePics || isAdult(player.birthDate) : false;
		const from = side(previousById.get(row.id)?.teamId);
		const to = side(row.teamId);

		return {
			id: row.id,
			playerName: player ? playerDisplayName(player.name, player.nickname) : `#${row.playerId}`,
			picture: profilePicture(showPicture ? player?.picture : null),
			href: player ? playerHref(player.id, player.name) : null,
			fromLabel: from.label,
			fromHref: from.href,
			fromEmblem: from.emblem,
			toLabel: to.label,
			toHref: to.href,
			toEmblem: to.emblem,
			date: naiveToIso(row.date),
			editHref: canEdit ? legacyUrl(`/transfers/${row.id}`) : null
		};
	});
}

/** Every visible transfer on one day, newest first. */
export async function getTransfersForDay(
	day: string,
	options: TransferViewOptions = {}
): Promise<TransferView[]> {
	const rows = await db
		.select(rowColumns)
		.from(transfers)
		.where(and(published, onDay(day)))
		.orderBy(desc(transfers.date), desc(transfers.id));
	return buildTransferViews(rows, options);
}

/** Days in `[from, to]` (inclusive) that have visible transfers, for the date rail dots. */
export async function getTransferDayMarkers(
	from: string,
	to: string
): Promise<Record<string, 'transfers'>> {
	const { startNaive } = transferDayRange(from);
	const { endNaive } = transferDayRange(to);
	const rows = await db
		.select({ day: dayOf })
		.from(transfers)
		.where(
			and(published, sql`${transfers.date} >= ${startNaive}`, sql`${transfers.date} < ${endNaive}`)
		)
		.groupBy(dayOf);

	const markers: Record<string, 'transfers'> = {};
	for (const row of rows) {
		const day = toDay(row.day);
		if (day) markers[day] = 'transfers';
	}
	return markers;
}

/** Most recent day with a visible transfer. */
export async function getLatestTransferDay(): Promise<string | null> {
	const [row] = await db
		.select({ day: sql<string | null>`DATE(MAX(${transfers.date}))` })
		.from(transfers)
		.where(published);
	return toDay(row?.day);
}

/** Latest day with a visible transfer strictly before `day`. */
export async function getPreviousTransferDay(day: string): Promise<string | null> {
	const { startNaive } = transferDayRange(day);
	const [row] = await db
		.select({ day: sql<string | null>`DATE(MAX(${transfers.date}))` })
		.from(transfers)
		.where(and(published, sql`${transfers.date} < ${startNaive}`));
	return toDay(row?.day);
}

/**
 * Feed page of transfer days, newest first: each day's total plus its first few transfers.
 * `beforeDay` is exclusive. Pictures follow the age rule only, since the feed has no user.
 */
export async function fetchTransferDayGroups({
	beforeDay,
	limit
}: {
	beforeDay: string | null;
	limit: number;
}): Promise<TransferDayGroup[]> {
	const days = await db
		.select({ day: dayOf, total: sql<number>`count(*)`.mapWith(Number) })
		.from(transfers)
		.where(
			and(
				published,
				beforeDay ? sql`${transfers.date} < ${transferDayRange(beforeDay).startNaive}` : undefined
			)
		)
		.groupBy(dayOf)
		.orderBy(desc(dayOf))
		.limit(limit);

	const groups = days.flatMap((row) => {
		const day = toDay(row.day);
		return day ? [{ day, total: row.total }] : [];
	});
	if (groups.length === 0) return [];

	// One round trip for every day's preview, instead of a query (and a connection) per day.
	const previews = groups.map(({ day }) => {
		const { startNaive, endNaive } = transferDayRange(day);
		return sql`(SELECT ${transfers.id} AS id, ${transfers.playerId} AS playerId, ${transfers.teamId} AS teamId, ${transfers.date} AS date
			FROM ${transfers}
			WHERE ${published} AND ${transfers.date} >= ${startNaive} AND ${transfers.date} < ${endNaive}
			ORDER BY ${transfers.date} DESC, ${transfers.id} DESC
			LIMIT ${TRANSFER_FEED_PREVIEW})`;
	});
	const [result] = await db.execute(sql.join(previews, sql` UNION ALL `));
	const rows = (
		result as unknown as { id: number; playerId: number; teamId: number | null; date: string }[]
	)
		// UNION ALL keeps no order of its own: newest first again, within each day.
		.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));

	const views = await buildTransferViews(rows);
	const viewsByDay = new Map<string, TransferView[]>();
	for (const view of views) {
		const day = view.date.slice(0, 10);
		viewsByDay.set(day, [...(viewsByDay.get(day) ?? []), view]);
	}

	return groups.map((group) => ({ ...group, transfers: viewsByDay.get(group.day) ?? [] }));
}
