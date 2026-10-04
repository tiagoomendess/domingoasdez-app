/**
 * Server helpers for the staff detail page.
 * Ports Front\TeamAgentController@show.
 */
import { desc, eq } from 'drizzle-orm';
import type { AuthUser } from '#lib/auth/user.ts';
import { clubHref, playerHref, type AgentType } from '#lib/clubs.ts';
import { isAdult, playerAge, playerDisplayName } from '#lib/players.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, players, teamAgentHistory, teamAgents, teams } from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { profilePicture } from '#lib/server/media.ts';

export type ResolvedAgent = {
	id: number;
	name: string;
	picture: string | null;
	birthDate: string | null;
	agentType: AgentType;
	teamId: number | null;
	playerId: number | null;
};

export type AgentClubView = {
	name: string;
	teamName: string;
	emblem: string | null;
	href: string;
};

export type AgentPlayerView = {
	name: string;
	picture: string;
	href: string;
};

export type AgentHistoryView = {
	id: number;
	clubName: string | null;
	teamName: string | null;
	emblem: string | null;
	href: string | null;
	agentType: AgentType;
	startedAt: string;
};

export type AgentPageData = {
	id: number;
	name: string;
	picture: string;
	age: number | null;
	agentType: AgentType;
	club: AgentClubView | null;
	player: AgentPlayerView | null;
	history: AgentHistoryView[];
	editHref: string | null;
	seo: {
		title: string;
		description: string;
		ogTitle: string;
		ogImage: string | null;
	};
};

export async function findAgentById(id: number): Promise<ResolvedAgent | null> {
	const [row] = await db
		.select({
			id: teamAgents.id,
			name: teamAgents.name,
			picture: teamAgents.picture,
			birthDate: teamAgents.birthDate,
			agentType: teamAgents.agentType,
			teamId: teamAgents.teamId,
			playerId: teamAgents.playerId
		})
		.from(teamAgents)
		.where(eq(teamAgents.id, id))
		.limit(1);

	if (!row) return null;

	return {
		id: row.id,
		name: row.name,
		picture: row.picture,
		birthDate: row.birthDate?.trim() || null,
		agentType: row.agentType,
		teamId: row.teamId,
		playerId: row.playerId
	};
}

async function loadCurrentClub(teamId: number | null): Promise<AgentClubView | null> {
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

async function loadLinkedPlayer(
	playerId: number | null,
	canSeeUnderagePics: boolean,
	now: Date
): Promise<AgentPlayerView | null> {
	if (playerId == null) return null;

	const [row] = await db
		.select({
			id: players.id,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			birthDate: players.birthDate,
			visible: players.visible
		})
		.from(players)
		.where(eq(players.id, playerId))
		.limit(1);

	if (!row || !row.visible) return null;

	const showPic = canSeeUnderagePics || isAdult(row.birthDate, now);

	return {
		name: playerDisplayName(row.name, row.nickname),
		picture: profilePicture(showPic ? row.picture : null),
		href: playerHref(row.id, row.name)
	};
}

async function loadHistory(agentId: number): Promise<AgentHistoryView[]> {
	const rows = await db
		.select({
			id: teamAgentHistory.id,
			agentType: teamAgentHistory.agentType,
			startedAt: teamAgentHistory.startedAt,
			teamId: teamAgentHistory.teamId,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(teamAgentHistory)
		.leftJoin(teams, eq(teamAgentHistory.teamId, teams.id))
		.leftJoin(clubs, eq(teams.clubId, clubs.id))
		.where(eq(teamAgentHistory.teamAgentId, agentId))
		.orderBy(desc(teamAgentHistory.startedAt), desc(teamAgentHistory.id));

	return rows.map((row) => {
		const hasClub = row.teamId != null && row.clubName != null;
		return {
			id: row.id,
			clubName: hasClub ? row.clubName : null,
			teamName: hasClub ? row.teamName : null,
			emblem: emblemUrl(hasClub ? row.clubEmblem : null),
			href: hasClub && row.clubName ? clubHref(row.clubName) : null,
			agentType: row.agentType,
			startedAt: naiveToIso(row.startedAt)
		};
	});
}

export async function loadAgentPage(
	agent: ResolvedAgent,
	user: AuthUser | null,
	now = new Date()
): Promise<AgentPageData> {
	const perms = user ? await getUserPermissionNames(user.id) : new Set<string>();
	const canSeeUnderagePics = hasPermission(perms, 'players');
	const picture = profilePicture(agent.picture);

	const [club, player, history] = await Promise.all([
		loadCurrentClub(agent.teamId),
		loadLinkedPlayer(agent.playerId, canSeeUnderagePics, now),
		loadHistory(agent.id)
	]);

	return {
		id: agent.id,
		name: agent.name,
		picture,
		age: playerAge(agent.birthDate, now),
		agentType: agent.agentType,
		club,
		player,
		history,
		editHref: hasPermission(perms, 'team_agents.edit')
			? legacyUrl(`/team_agents/${agent.id}`)
			: null,
		seo: {
			title: agent.name,
			description: '',
			ogTitle: agent.name,
			ogImage: picture
		}
	};
}
