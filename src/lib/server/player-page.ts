/**
 * Server helpers for the player detail page.
 * Ports Front\PlayersController@show.
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '#lib/auth/user.ts';
import { clubHref } from '#lib/clubs.ts';
import { isAdult, limitTransfers, playerAge, type PlayerPosition } from '#lib/players.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	goals,
	mvpVotes,
	players,
	teams,
	transfers
} from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { profilePicture } from '#lib/server/media.ts';

export type ResolvedPlayer = {
	id: number;
	name: string;
	nickname: string | null;
	picture: string | null;
	birthDate: string | Date | null;
	position: PlayerPosition;
	teamId: number | null;
	visible: boolean;
};

export type PlayerClubView = {
	name: string;
	teamName: string;
	emblem: string | null;
	href: string;
};

export type PlayerTransferView = {
	id: number;
	clubName: string | null;
	teamName: string | null;
	emblem: string | null;
	href: string | null;
	date: string;
};

export type PlayerPageData = {
	id: number;
	name: string;
	nickname: string | null;
	picture: string;
	age: number | null;
	position: PlayerPosition;
	club: PlayerClubView | null;
	goals: number;
	mvpVotes: number;
	transfers: PlayerTransferView[];
	remainingTransfers: number;
	editHref: string | null;
	seo: {
		title: string;
		description: string;
		ogTitle: string;
		ogImage: string | null;
	};
};

/** Load a player row by id (visibility is checked by the caller). */
export async function findPlayerById(id: number): Promise<ResolvedPlayer | null> {
	const [row] = await db
		.select({
			id: players.id,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			birthDate: players.birthDate,
			position: players.position,
			teamId: players.teamId,
			visible: players.visible
		})
		.from(players)
		.where(eq(players.id, id))
		.limit(1);

	if (!row) return null;

	return {
		id: row.id,
		name: row.name,
		nickname: row.nickname,
		picture: row.picture,
		birthDate: row.birthDate,
		position: row.position,
		teamId: row.teamId,
		visible: row.visible
	};
}

async function loadCurrentClub(teamId: number | null): Promise<PlayerClubView | null> {
	if (teamId == null) return null;

	const [row] = await db
		.select({
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(teams)
		.innerJoin(clubs, eq(teams.clubId, clubs.id))
		.where(eq(teams.id, teamId))
		.limit(1);

	if (!row) return null;

	return {
		name: row.clubName,
		teamName: row.teamName,
		emblem: emblemUrl(row.clubEmblem),
		href: clubHref(row.clubName)
	};
}

async function countGoals(playerId: number): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(goals)
		.where(eq(goals.playerId, playerId));
	return row?.count ?? 0;
}

async function countMvpVotes(playerId: number): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(mvpVotes)
		.where(eq(mvpVotes.playerId, playerId));
	return row?.count ?? 0;
}

async function loadTransfers(
	playerId: number,
	canEditTransfers: boolean
): Promise<PlayerTransferView[]> {
	const rows = await db
		.select({
			id: transfers.id,
			date: transfers.date,
			teamId: transfers.teamId,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(transfers)
		.leftJoin(teams, eq(transfers.teamId, teams.id))
		.leftJoin(clubs, eq(teams.clubId, clubs.id))
		.where(and(eq(transfers.playerId, playerId), eq(transfers.visible, true)))
		.orderBy(desc(transfers.date), desc(transfers.id));

	return rows.map((row) => {
		const hasClub = row.teamId != null && row.clubName != null;
		let href: string | null = null;
		if (canEditTransfers) {
			href = legacyUrl(`/transfers/${row.id}`);
		} else if (hasClub && row.clubName) {
			href = clubHref(row.clubName);
		}

		return {
			id: row.id,
			clubName: hasClub ? row.clubName : null,
			teamName: hasClub ? row.teamName : null,
			emblem: emblemUrl(hasClub ? row.clubEmblem : null),
			href,
			date: naiveToIso(row.date)
		};
	});
}

/** Full page payload for the player detail route. */
export async function loadPlayerPage(
	player: ResolvedPlayer,
	user: AuthUser | null,
	now = new Date()
): Promise<PlayerPageData> {
	const perms = user ? await getUserPermissionNames(user.id) : new Set<string>();
	const canSeeUnderagePics = hasPermission(perms, 'players');
	const canEditTransfers = hasPermission(perms, 'transfers.edit');
	const isGuest = user == null;

	const showPic = canSeeUnderagePics || isAdult(player.birthDate, now);
	const picture = profilePicture(showPic ? player.picture : null);

	const [club, goalsCount, mvpVotesCount, allTransfers] = await Promise.all([
		loadCurrentClub(player.teamId),
		countGoals(player.id),
		countMvpVotes(player.id),
		loadTransfers(player.id, canEditTransfers)
	]);

	const { shown, remaining } = limitTransfers(allTransfers, isGuest);

	return {
		id: player.id,
		name: player.name,
		nickname: player.nickname?.trim() || null,
		picture,
		age: playerAge(player.birthDate, now),
		position: player.position,
		club,
		goals: goalsCount,
		mvpVotes: mvpVotesCount,
		transfers: shown,
		remainingTransfers: remaining,
		editHref: hasPermission(perms, 'players.edit')
			? legacyUrl(`/players/${player.id}/edit`)
			: null,
		seo: {
			title: player.name,
			description: '',
			ogTitle: player.name,
			ogImage: picture
		}
	};
}
