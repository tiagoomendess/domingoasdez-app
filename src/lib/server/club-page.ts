/**
 * Server helpers for the club detail page.
 * Ports Front\ClubController@show (with the multi-team transfers fix).
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { AuthUser } from '#lib/auth/user.ts';
import {
	agentListName,
	agentTypeRank,
	mergeClubTransfers,
	playerHref,
	teamAgentHref,
	type AgentType,
	type TransferRef
} from '#lib/clubs.ts';
import { isAdult, playerDisplayName } from '#lib/players.ts';
import { slugify } from '#lib/slug.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	players,
	playgrounds,
	teamAgents,
	teams,
	transfers
} from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { mediaUrl, placeholder16x9, profilePicture } from '#lib/server/media.ts';

export type ResolvedClub = {
	id: number;
	name: string;
	emblem: string | null;
};

export type ClubAgentView = {
	id: number;
	name: string;
	picture: string;
	agentType: AgentType;
	href: string;
};

export type ClubPlayerView = {
	id: number;
	name: string;
	picture: string;
	href: string;
};

export type ClubTeamView = {
	id: number;
	name: string;
	agents: ClubAgentView[];
	players: ClubPlayerView[];
	editHref: string | null;
};

export type ClubTransferView = {
	id: number;
	playerName: string;
	picture: string;
	href: string;
	teamName: string | null;
	date: string;
	direction: 'in' | 'out';
};

export type ClubPageData = {
	id: number;
	name: string;
	emblem: string | null;
	coverPicture: string;
	teams: ClubTeamView[];
	transfers: ClubTransferView[];
	editClubHref: string | null;
	seo: {
		title: string;
		description: string;
		ogTitle: string;
		ogImage: string | null;
	};
};

/** Resolve a visible club by matching slugify(name) === slug (legacy findByNameSlug). */
export async function findClubBySlug(slug: string): Promise<ResolvedClub | null> {
	const rows = await db
		.select({
			id: clubs.id,
			name: clubs.name,
			emblem: clubs.emblem,
			visible: clubs.visible
		})
		.from(clubs)
		.orderBy(asc(clubs.id));

	for (const row of rows) {
		if (slugify(row.name) !== slug) continue;
		if (!row.visible) return null;
		return { id: row.id, name: row.name, emblem: row.emblem };
	}

	return null;
}

async function loadVenue(clubId: number): Promise<{ coverPicture: string }> {
	const [row] = await db
		.select({
			id: playgrounds.id,
			picture: playgrounds.picture
		})
		.from(playgrounds)
		.where(eq(playgrounds.clubId, clubId))
		.orderBy(asc(playgrounds.id))
		.limit(1);

	if (!row) {
		return { coverPicture: placeholder16x9(clubId) };
	}

	const picture = row.picture?.trim() ? mediaUrl(row.picture)! : placeholder16x9(row.id);
	return { coverPicture: picture };
}

async function loadTeamsBlock(
	clubId: number,
	perms: Set<string>,
	now: Date
): Promise<ClubTeamView[]> {
	const teamRows = await db
		.select({
			id: teams.id,
			name: teams.name
		})
		.from(teams)
		.where(and(eq(teams.clubId, clubId), eq(teams.visible, true)))
		.orderBy(asc(teams.id));

	if (teamRows.length === 0) return [];

	const teamIds = teamRows.map((t) => t.id);
	const canSeeUnderagePics = hasPermission(perms, 'players');

	const [agentRows, playerRows] = await Promise.all([
		db
			.select({
				id: teamAgents.id,
				teamId: teamAgents.teamId,
				name: teamAgents.name,
				picture: teamAgents.picture,
				agentType: teamAgents.agentType
			})
			.from(teamAgents)
			.where(inArray(teamAgents.teamId, teamIds)),
		db
			.select({
				id: players.id,
				teamId: players.teamId,
				name: players.name,
				nickname: players.nickname,
				picture: players.picture,
				birthDate: players.birthDate
			})
			.from(players)
			.where(and(inArray(players.teamId, teamIds), eq(players.visible, true)))
			.orderBy(asc(players.name))
	]);

	agentRows.sort((a, b) => {
		const rank = agentTypeRank(a.agentType) - agentTypeRank(b.agentType);
		if (rank !== 0) return rank;
		return a.id - b.id;
	});

	const agentsByTeam = new Map<number, ClubAgentView[]>();
	for (const row of agentRows) {
		if (row.teamId == null) continue;
		const view: ClubAgentView = {
			id: row.id,
			name: agentListName(row.name),
			picture: profilePicture(row.picture),
			agentType: row.agentType,
			href: teamAgentHref(row.id, row.name)
		};
		const list = agentsByTeam.get(row.teamId);
		if (list) list.push(view);
		else agentsByTeam.set(row.teamId, [view]);
	}

	const playersByTeam = new Map<number, ClubPlayerView[]>();
	for (const row of playerRows) {
		if (row.teamId == null) continue;
		const showPic = canSeeUnderagePics || isAdult(row.birthDate, now);
		const view: ClubPlayerView = {
			id: row.id,
			name: playerDisplayName(row.name, row.nickname),
			picture: profilePicture(showPic ? row.picture : null),
			href: playerHref(row.id, row.name)
		};
		const list = playersByTeam.get(row.teamId);
		if (list) list.push(view);
		else playersByTeam.set(row.teamId, [view]);
	}

	return teamRows.map((team) => ({
		id: team.id,
		name: team.name,
		agents: agentsByTeam.get(team.id) ?? [],
		players: playersByTeam.get(team.id) ?? [],
		editHref: hasPermission(perms, `teams.edit.${team.id}`) ? legacyUrl(`/teams/${team.id}`) : null
	}));
}

async function loadTransfersBlock(
	clubId: number,
	teamIds: number[],
	perms: Set<string>,
	now: Date
): Promise<ClubTransferView[]> {
	if (teamIds.length === 0) return [];

	const canSeeUnderagePics = hasPermission(perms, 'players');

	const incomingRows = await db
		.select({
			id: transfers.id,
			playerId: transfers.playerId,
			teamId: transfers.teamId,
			date: transfers.date
		})
		.from(transfers)
		.where(inArray(transfers.teamId, teamIds));

	if (incomingRows.length === 0) return [];

	const playerIds = [...new Set(incomingRows.map((r) => r.playerId))];

	const historyRows = await db
		.select({
			id: transfers.id,
			playerId: transfers.playerId,
			teamId: transfers.teamId,
			date: transfers.date
		})
		.from(transfers)
		.where(inArray(transfers.playerId, playerIds));

	const toRef = (row: { id: number; playerId: number; date: string | Date }): TransferRef => ({
		id: row.id,
		playerId: row.playerId,
		date:
			row.date instanceof Date
				? row.date.toISOString().slice(0, 19).replace('T', ' ')
				: String(row.date).slice(0, 19).replace('T', ' ')
	});

	const merged = mergeClubTransfers(incomingRows.map(toRef), historyRows.map(toRef));
	const mergedIds = merged.map((t) => t.id);
	if (mergedIds.length === 0) return [];

	const detailRows = await db
		.select({
			id: transfers.id,
			teamId: transfers.teamId,
			date: transfers.date,
			playerId: players.id,
			playerName: players.name,
			playerNickname: players.nickname,
			playerPicture: players.picture,
			playerBirthDate: players.birthDate,
			playerVisible: players.visible,
			teamName: teams.name,
			teamClubId: teams.clubId
		})
		.from(transfers)
		.innerJoin(players, eq(transfers.playerId, players.id))
		.leftJoin(teams, eq(transfers.teamId, teams.id))
		.where(inArray(transfers.id, mergedIds));

	const byId = new Map(detailRows.map((row) => [row.id, row]));

	const views: ClubTransferView[] = [];
	for (const ref of merged) {
		const row = byId.get(ref.id);
		if (!row || !row.playerVisible) continue;

		const showPic = canSeeUnderagePics || isAdult(row.playerBirthDate, now);
		const direction: 'in' | 'out' =
			row.teamClubId != null && row.teamClubId === clubId ? 'in' : 'out';

		views.push({
			id: row.id,
			playerName: playerDisplayName(row.playerName, row.playerNickname),
			picture: profilePicture(showPic ? row.playerPicture : null),
			href: playerHref(row.playerId, row.playerName),
			teamName: row.teamName,
			date: naiveToIso(row.date),
			direction
		});
	}

	return views;
}

/** Full page payload for the club detail route. */
export async function loadClubPage(
	club: ResolvedClub,
	user: AuthUser | null,
	now = new Date()
): Promise<ClubPageData> {
	const perms = user ? await getUserPermissionNames(user.id) : new Set<string>();

	const [{ coverPicture }, teamViews] = await Promise.all([
		loadVenue(club.id),
		loadTeamsBlock(club.id, perms, now)
	]);

	const transferViews = await loadTransfersBlock(
		club.id,
		teamViews.map((t) => t.id),
		perms,
		now
	);

	const emblem = emblemUrl(club.emblem);

	return {
		id: club.id,
		name: club.name,
		emblem,
		coverPicture,
		teams: teamViews,
		transfers: transferViews,
		editClubHref: hasPermission(perms, `clubs.edit.${club.id}`)
			? legacyUrl(`/clubs/${club.id}`)
			: null,
		seo: {
			title: club.name,
			description: '',
			ogTitle: `${club.name}`,
			ogImage: emblem
		}
	};
}
