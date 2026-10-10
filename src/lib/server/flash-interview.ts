/**
 * Server helpers for the user-facing flash-interview flow.
 * Ports Front\GameCommentsController (edit + PIN + manage-notifications).
 * Comment/email generation stays on Laravel; this only reads/writes the
 * shared tables (game_comments, goals, teams, clubs).
 */
import type { Cookies } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { dev } from '$app/env';
import {
	FLASH_PIN_COOKIE_MAX_AGE,
	FLASH_TOAST_COOKIE,
	flashPinCookieName,
	isCorrectPin,
	isValidContactEmail,
	parseGoalPick,
	parseMinute,
	parseNotificationsEnabled,
	sanitizeComment,
	validateComment,
	type FlashToastKind
} from '#lib/flash-interview.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameComments,
	gameGroups,
	games,
	goals,
	players,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { alias } from 'drizzle-orm/mysql-core';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

function displayName(seasonName: string | null, competitionName: string): string {
	return seasonName?.trim() || competitionName;
}

export function pinCookieName(uuid: string): string {
	return flashPinCookieName(uuid);
}

export function readPinCookie(cookies: Cookies, uuid: string): string | null {
	const raw = cookies.get(pinCookieName(uuid))?.trim();
	return raw ? raw : null;
}

/** Remember a verified PIN in a short-lived httpOnly cookie scoped to the interview. */
export function setPinCookie(cookies: Cookies, uuid: string, pin: string): void {
	cookies.set(pinCookieName(uuid), pin, {
		path: `/flash-interview/${uuid}`,
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: FLASH_PIN_COOKIE_MAX_AGE
	});
}

export function setFlashToast(cookies: Cookies, kind: FlashToastKind): void {
	cookies.set(FLASH_TOAST_COOKIE, kind, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60
	});
}

export function consumeFlashToast(cookies: Cookies): FlashToastKind | null {
	const raw = cookies.get(FLASH_TOAST_COOKIE);
	if (!raw) return null;
	cookies.delete(FLASH_TOAST_COOKIE, { path: '/' });
	return raw === 'saved' ||
		raw === 'deadline' ||
		raw === 'invalid' ||
		raw === 'notif_saved' ||
		raw === 'notif_email'
		? raw
		: null;
}

export type FlashPlayer = { id: number; name: string; nickname: string | null };
export type FlashGoalRow = { playerId: number | null; ownGoal: boolean; minute: number | null };

export type FlashInterviewPage = {
	uuid: string;
	competition: string;
	home: { name: string; emblem: string | null; score: number };
	away: { name: string; emblem: string | null; score: number };
	recipientClubName: string;
	amountOfGoals: number;
	content: string;
	players: FlashPlayer[];
	goals: FlashGoalRow[];
	gameDateIso: string;
	deadlineIso: string | null;
	canEdit: boolean;
};

type CommentRow = typeof gameComments.$inferSelect;

async function findComment(uuid: string): Promise<CommentRow | null> {
	const [row] = await db.select().from(gameComments).where(eq(gameComments.uuid, uuid)).limit(1);
	return row ?? null;
}

export function checkPin(pin: unknown, expected: string): boolean {
	return isCorrectPin(pin, expected);
}

/** Lightweight PIN lookup for gate checks (avoids loading the full page). */
export async function findCommentPin(uuid: string): Promise<string | null> {
	const comment = await findComment(uuid);
	return comment?.pin ?? null;
}

export async function loadFlashInterviewPage(input: {
	uuid: string;
	now?: Date;
}): Promise<FlashInterviewPage | null> {
	const comment = await findComment(input.uuid);
	if (!comment) return null;
	const now = input.now ?? new Date();

	const [match] = await db
		.select({
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			date: games.date,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem,
			seasonName: seasons.name,
			competitionName: competitions.name
		})
		.from(games)
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(seasons, eq(gameGroups.seasonId, seasons.id))
		.innerJoin(competitions, eq(seasons.competitionId, competitions.id))
		.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(eq(games.id, comment.gameId))
		.limit(1);
	if (!match) return null;

	const isHome = comment.teamId === match.homeTeamId;
	const amountOfGoals = isHome ? (match.goalsHome ?? 0) : (match.goalsAway ?? 0);

	const playerRows = await db
		.select({ id: players.id, name: players.name, nickname: players.nickname })
		.from(players)
		.where(and(eq(players.teamId, comment.teamId), eq(players.visible, true)))
		.orderBy(asc(players.id));

	const goalRows = await db
		.select({
			playerId: goals.playerId,
			ownGoal: goals.ownGoal,
			minute: goals.minute
		})
		.from(goals)
		.where(and(eq(goals.gameId, comment.gameId), eq(goals.teamId, comment.teamId)))
		.orderBy(asc(goals.id));

	const recipientClubName = isHome ? match.homeClubName : match.awayClubName;
	const deadlineIso = comment.deadline ? naiveToIso(comment.deadline) : null;
	const canEdit = deadlineIso != null && now.getTime() < new Date(deadlineIso).getTime();

	return {
		uuid: comment.uuid,
		competition: displayName(match.seasonName, match.competitionName),
		home: {
			name: match.homeClubName,
			emblem: emblemUrl(match.homeClubEmblem),
			score: match.goalsHome ?? 0
		},
		away: {
			name: match.awayClubName,
			emblem: emblemUrl(match.awayClubEmblem),
			score: match.goalsAway ?? 0
		},
		recipientClubName,
		amountOfGoals: Math.max(0, amountOfGoals),
		content: comment.content ?? '',
		players: playerRows.map((p) => ({ id: p.id, name: p.name, nickname: p.nickname })),
		goals: goalRows.map((g) => ({
			playerId: g.playerId,
			ownGoal: Boolean(g.ownGoal),
			minute: g.minute
		})),
		gameDateIso: naiveToIso(match.date),
		deadlineIso,
		canEdit
	};
}

export type SaveFlashResult =
	{ ok: true } | { ok: false; error: 'not_found' | 'bad_pin' | 'closed' | 'invalid' };

export async function saveFlashInterview(input: {
	uuid: string;
	pin: unknown;
	content: unknown;
	playerValues: unknown[];
	minuteValues: unknown[];
	now?: Date;
}): Promise<SaveFlashResult> {
	const comment = await findComment(input.uuid);
	if (!comment) return { ok: false, error: 'not_found' };
	if (!checkPin(input.pin, comment.pin)) return { ok: false, error: 'bad_pin' };

	const now = input.now ?? new Date();
	const deadlineIso = comment.deadline ? naiveToIso(comment.deadline) : null;
	if (deadlineIso == null || now.getTime() >= new Date(deadlineIso).getTime()) {
		return { ok: false, error: 'closed' };
	}

	if (!validateComment(input.content).ok) return { ok: false, error: 'invalid' };

	await db
		.update(gameComments)
		.set({ content: sanitizeComment(input.content), updatedAt: now })
		.where(eq(gameComments.id, comment.id));

	await upsertGoals(comment, input.playerValues, input.minuteValues, now);
	return { ok: true };
}

/** Port `handleGoals`: update-or-create one row per goal of the comment's team. */
async function upsertGoals(
	comment: CommentRow,
	playerValues: unknown[],
	minuteValues: unknown[],
	now: Date
): Promise<void> {
	const [game] = await db
		.select({
			id: games.id,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			homeTeamId: games.homeTeamId
		})
		.from(games)
		.where(eq(games.id, comment.gameId))
		.limit(1);
	if (!game) return;

	const isHome = comment.teamId === game.homeTeamId;
	const amount = Math.max(0, isHome ? (game.goalsHome ?? 0) : (game.goalsAway ?? 0));

	const existing = await db
		.select({ id: goals.id })
		.from(goals)
		.where(and(eq(goals.gameId, game.id), eq(goals.teamId, comment.teamId)))
		.orderBy(asc(goals.id));

	for (let i = 0; i < amount; i += 1) {
		const pick = parseGoalPick(playerValues[i]);
		const minute = parseMinute(minuteValues[i]);
		const values = {
			playerId: pick.kind === 'player' ? pick.playerId : null,
			ownGoal: pick.kind === 'own_goal',
			minute,
			updatedAt: now
		};

		if (!existing[i]) {
			await db.insert(goals).values({
				playerId: values.playerId,
				teamId: comment.teamId,
				gameId: game.id,
				ownGoal: values.ownGoal,
				penalty: false,
				minute: values.minute,
				visible: true,
				createdAt: now,
				updatedAt: now
			});
			continue;
		}

		await db.update(goals).set(values).where(eq(goals.id, existing[i].id));
	}
}

export type NotificationsPage = {
	uuid: string;
	clubName: string;
	contactEmail: string;
	notificationsEnabled: boolean;
};

export async function loadManageNotifications(input: {
	uuid: string;
	pin: unknown;
}): Promise<NotificationsPage | null> {
	const comment = await findComment(input.uuid);
	if (!comment || !checkPin(input.pin, comment.pin)) return null;

	const [team] = await db
		.select({ contactEmail: teams.contactEmail, clubId: teams.clubId })
		.from(teams)
		.where(eq(teams.id, comment.teamId))
		.limit(1);
	const [club] = team
		? await db
				.select({
					name: clubs.name,
					contactEmail: clubs.contactEmail,
					notificationsEnabled: clubs.notificationsEnabled
				})
				.from(clubs)
				.where(eq(clubs.id, team.clubId))
				.limit(1)
		: [];

	if (!team || !club) return null;

	return {
		uuid: comment.uuid,
		clubName: club.name,
		contactEmail: team.contactEmail?.trim() || club.contactEmail?.trim() || '',
		notificationsEnabled: Boolean(club.notificationsEnabled)
	};
}

export type SaveNotificationsResult =
	{ ok: true } | { ok: false; error: 'not_found' | 'bad_pin' | 'invalid_email' };

export async function saveManageNotifications(input: {
	uuid: string;
	pin: unknown;
	contactEmail: unknown;
	notificationsEnabled: unknown;
	now?: Date;
}): Promise<SaveNotificationsResult> {
	const comment = await findComment(input.uuid);
	if (!comment) return { ok: false, error: 'not_found' };
	if (!checkPin(input.pin, comment.pin)) return { ok: false, error: 'bad_pin' };
	if (!isValidContactEmail(input.contactEmail)) {
		return { ok: false, error: 'invalid_email' };
	}

	const now = input.now ?? new Date();
	const email = String(input.contactEmail).trim();
	const enabled = parseNotificationsEnabled(input.notificationsEnabled);

	const [team] = await db
		.select({ id: teams.id, contactEmail: teams.contactEmail, clubId: teams.clubId })
		.from(teams)
		.where(eq(teams.id, comment.teamId))
		.limit(1);
	if (!team) return { ok: false, error: 'not_found' };

	if (team.contactEmail?.trim()) {
		await db
			.update(teams)
			.set({ contactEmail: email.slice(0, 155), updatedAt: now })
			.where(eq(teams.id, team.id));
	} else {
		await db
			.update(clubs)
			.set({ contactEmail: email.slice(0, 155), updatedAt: now })
			.where(eq(clubs.id, team.clubId));
	}

	await db
		.update(clubs)
		.set({ notificationsEnabled: enabled, updatedAt: now })
		.where(eq(clubs.id, team.clubId));

	return { ok: true };
}
