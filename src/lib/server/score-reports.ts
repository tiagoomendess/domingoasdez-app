/**
 * Server helpers for the public score-report page.
 * Ports Front\ScoreReportsController create + store.
 */
import type { Cookies } from '@sveltejs/kit';
import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { dev } from '$app/env';
import type { AuthUser } from '#lib/auth/user.ts';
import { verifyRecaptcha } from '#lib/server/captcha.ts';
import { allowScoreReports, gameHref } from '#lib/games.ts';
import {
	SCORE_REPORT_FLASH_COOKIE,
	SCORE_REPORT_UUID_COOKIE,
	SCORE_REPORT_UUID_MAX_AGE,
	canMarkFinished,
	checkRateLimits,
	clampLocationAccuracy,
	findMatchingBan,
	isNearPlayground,
	isValidUuidCookie,
	parseOptionalCoord,
	ridiculousBanReason,
	safeReturnTo,
	validateScores,
	type ScoreReportBanRow
} from '#lib/score-reports.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	playgrounds,
	scoreReportBans,
	scoreReports,
	seasons,
	teams,
	userUuids,
	uuidKarmas
} from '#lib/server/db/schema.ts';
import { parsePointLatLon } from '#lib/server/game-page.ts';
import { emblemUrl, goalCountsByGame, resolveScores } from '#lib/server/games.ts';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

function displayName(seasonName: string | null, competitionName: string): string {
	return seasonName?.trim() || competitionName;
}

export type ScoreReportBanView = {
	expiresAt: string;
	reason: string | null;
	shadowBan: boolean;
};

export type ScoreReportAlreadySent = {
	homeScore: number;
	awayScore: number;
	finished: boolean;
};

export type ScoreReportPageData = {
	gameId: number;
	gameHref: string;
	returnTo: string;
	home: { name: string; emblem: string | null };
	away: { name: string; emblem: string | null };
	homeScore: number;
	awayScore: number;
	gameFinished: boolean;
	accepting: boolean;
	canFinish: boolean;
	ban: ScoreReportBanView | null;
	alreadySent: ScoreReportAlreadySent[];
	loggedIn: boolean;
	recaptchaSiteKey: string | null;
};

export type SubmitScoreReportInput = {
	gameId: number;
	homeScore: number;
	awayScore: number;
	finished: boolean;
	latitude: unknown;
	longitude: unknown;
	accuracy: unknown;
	returnTo: string | null;
	recaptchaToken: string | null;
	uuid: string;
	user: AuthUser | null;
	ipAddress: string;
	ipCountry: string | null;
	userAgent: string | null;
	origin: string;
	now?: Date;
};

export type SubmitScoreReportResult =
	| {
			ok: true;
			redirectTo: string;
			messageKey: 'success' | 'success_no_location' | 'shadow';
			homeScore: number;
			awayScore: number;
	  }
	| {
			ok: false;
			error:
				| 'not_found'
				| 'closed'
				| 'banned'
				| 'duplicate'
				| 'recent'
				| 'recent_ip'
				| 'invalid'
				| 'captcha'
				| 'uuid';
			banCreated?: boolean;
	  };

function limit(value: string, max: number): string {
	return value.length <= max ? value : value.slice(0, max);
}

export function ensureScoreReportUuid(cookies: Cookies): string {
	const existing = cookies.get(SCORE_REPORT_UUID_COOKIE);
	if (isValidUuidCookie(existing)) return existing;

	const uuid = crypto.randomUUID();
	cookies.set(SCORE_REPORT_UUID_COOKIE, uuid, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SCORE_REPORT_UUID_MAX_AGE
	});
	return uuid;
}

export function setScoreReportFlash(
	cookies: Cookies,
	payload: { messageKey: string; homeScore?: number; awayScore?: number }
) {
	cookies.set(SCORE_REPORT_FLASH_COOKIE, JSON.stringify(payload), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60
	});
}

export function consumeScoreReportFlash(
	cookies: Cookies
): { messageKey: string; homeScore?: number; awayScore?: number } | null {
	const raw = cookies.get(SCORE_REPORT_FLASH_COOKIE);
	if (!raw) return null;
	cookies.delete(SCORE_REPORT_FLASH_COOKIE, { path: '/' });
	try {
		const parsed = JSON.parse(raw) as {
			messageKey?: string;
			homeScore?: number;
			awayScore?: number;
		};
		if (!parsed?.messageKey) return null;
		return {
			messageKey: parsed.messageKey,
			homeScore: parsed.homeScore,
			awayScore: parsed.awayScore
		};
	} catch {
		return null;
	}
}

async function loadActiveBans(input: {
	uuid: string;
	userId: number | null;
	ipAddress: string | null;
}): Promise<ScoreReportBanRow[]> {
	const now = new Date();
	const conditions = [eq(scoreReportBans.uuid, input.uuid)];
	if (input.userId != null) conditions.push(eq(scoreReportBans.userId, input.userId));
	if (input.ipAddress) conditions.push(eq(scoreReportBans.ipAddress, input.ipAddress));

	const rows = await db
		.select({
			id: scoreReportBans.id,
			userId: scoreReportBans.userId,
			uuid: scoreReportBans.uuid,
			ipAddress: scoreReportBans.ipAddress,
			userAgent: scoreReportBans.userAgent,
			shadowBan: scoreReportBans.shadowBan,
			ipBan: scoreReportBans.ipBan,
			reason: scoreReportBans.reason,
			expiresAt: scoreReportBans.expiresAt
		})
		.from(scoreReportBans)
		.where(and(gt(scoreReportBans.expiresAt, now), or(...conditions)))
		.orderBy(desc(scoreReportBans.id));

	return rows.map((row) => ({
		...row,
		shadowBan: Boolean(row.shadowBan),
		ipBan: Boolean(row.ipBan)
	}));
}

async function loadAlreadySent(
	gameId: number,
	uuid: string,
	userId: number | null
): Promise<ScoreReportAlreadySent[]> {
	const userMatch = userId != null ? eq(scoreReports.userId, userId) : sql`false`;
	const rows = await db
		.select({
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore,
			finished: scoreReports.finished
		})
		.from(scoreReports)
		.where(
			and(eq(scoreReports.gameId, gameId), or(eq(scoreReports.uuid, uuid), userMatch))
		)
		.orderBy(desc(scoreReports.id));

	return rows.map((row) => ({
		homeScore: row.homeScore,
		awayScore: row.awayScore,
		finished: Boolean(row.finished)
	}));
}

type GameForReport = {
	id: number;
	date: string | Date;
	goalsHome: number | null;
	goalsAway: number | null;
	finished: boolean;
	visible: boolean;
	postponed: boolean;
	playgroundId: number | null;
	homeTeamId: number;
	awayTeamId: number;
	homeClubName: string;
	homeClubEmblem: string | null;
	awayClubName: string;
	awayClubEmblem: string | null;
	groupName: string | null;
	round: number;
	startYear: number;
	endYear: number;
	seasonName: string | null;
	competitionName: string;
};

async function findGameForReport(gameId: number): Promise<GameForReport | null> {
	const [row] = await db
		.select({
			id: games.id,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			finished: games.finished,
			visible: games.visible,
			postponed: games.postponed,
			playgroundId: games.playgroundId,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem,
			groupName: gameGroups.name,
			round: games.round,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
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
		.where(and(eq(games.id, gameId), eq(games.visible, true)))
		.limit(1);

	if (!row) return null;
	return {
		...row,
		finished: Boolean(row.finished),
		visible: Boolean(row.visible),
		postponed: Boolean(row.postponed)
	};
}

function gamePublicHref(game: GameForReport): string {
	const display = displayName(game.seasonName, game.competitionName);
	const groupName = game.groupName?.trim() || display;
	return gameHref({
		startYear: game.startYear,
		endYear: game.endYear,
		displayName: display,
		groupName,
		round: game.round,
		homeClubName: game.homeClubName,
		awayClubName: game.awayClubName
	});
}

export async function loadScoreReportPage(input: {
	gameId: number;
	uuid: string;
	user: AuthUser | null;
	ipAddress: string;
	userAgent: string | null;
	returnToRaw: string | null;
	origin: string;
	recaptchaSiteKey: string | null;
	now?: Date;
}): Promise<ScoreReportPageData | null> {
	const now = input.now ?? new Date();
	const game = await findGameForReport(input.gameId);
	if (!game) return null;

	const kickoff = naiveToIso(game.date);
	const href = gamePublicHref(game);
	const returnTo = safeReturnTo(input.returnToRaw, input.origin, href);

	const needCounts = game.goalsHome == null || game.goalsAway == null ? [game.id] : [];
	const counts = await goalCountsByGame(needCounts);
	const { homeScore, awayScore } = resolveScores(
		{
			id: game.id,
			goalsHome: game.goalsHome,
			goalsAway: game.goalsAway,
			homeTeamId: game.homeTeamId,
			awayTeamId: game.awayTeamId
		},
		counts
	);

	const bans = await loadActiveBans({
		uuid: input.uuid,
		userId: input.user?.id ?? null,
		ipAddress: input.ipAddress || null
	});
	const matched = findMatchingBan(bans, {
		uuid: input.uuid,
		userId: input.user?.id ?? null,
		ipAddress: input.ipAddress || null,
		userAgent: input.userAgent
	});

	const visibleBan =
		matched && !matched.shadowBan
			? {
					expiresAt:
						matched.expiresAt instanceof Date
							? matched.expiresAt.toISOString()
							: String(matched.expiresAt ?? ''),
					reason: matched.reason,
					shadowBan: false
				}
			: null;

	const alreadySent = await loadAlreadySent(game.id, input.uuid, input.user?.id ?? null);

	return {
		gameId: game.id,
		gameHref: href,
		returnTo,
		home: { name: game.homeClubName, emblem: emblemUrl(game.homeClubEmblem) },
		away: { name: game.awayClubName, emblem: emblemUrl(game.awayClubEmblem) },
		homeScore,
		awayScore,
		gameFinished: game.finished,
		accepting: allowScoreReports(kickoff, now),
		canFinish: canMarkFinished(kickoff, now),
		ban: visibleBan,
		alreadySent,
		loggedIn: Boolean(input.user),
		recaptchaSiteKey: input.user ? null : input.recaptchaSiteKey
	};
}

async function ensureUserUuid(userId: number, uuid: string) {
	const [existing] = await db
		.select({ id: userUuids.id })
		.from(userUuids)
		.where(and(eq(userUuids.userId, userId), eq(userUuids.uuid, uuid)))
		.limit(1);
	if (existing) return;

	await db.insert(userUuids).values({
		userId,
		uuid: limit(uuid, 36)
	});
}

async function createRidiculousBan(input: {
	uuid: string;
	ipAddress: string;
	userAgent: string | null;
	homeClubName: string;
	awayClubName: string;
	now: Date;
}) {
	const expires = new Date(input.now.getTime() + 2 * 24 * 60 * 60 * 1000);
	await db.insert(scoreReportBans).values({
		uuid: limit(input.uuid, 36),
		ipAddress: limit(input.ipAddress, 45),
		userAgent: input.userAgent ? limit(input.userAgent, 255) : null,
		reason: limit(ridiculousBanReason(input.homeClubName, input.awayClubName), 255),
		expiresAt: expires,
		shadowBan: false,
		ipBan: false
	});
}

async function handleKarma(input: {
	uuid: string;
	userId: number | null;
	lat: number | null;
	lon: number | null;
	playgroundId: number | null;
}) {
	if (!input.uuid) return;

	const [existing] = await db
		.select({ uuid: uuidKarmas.uuid, karma: uuidKarmas.karma })
		.from(uuidKarmas)
		.where(eq(uuidKarmas.uuid, input.uuid))
		.limit(1);

	if (!existing) {
		await db.insert(uuidKarmas).values({ uuid: input.uuid, karma: 0 });
	}

	let karmaToAdd = 0;

	if (input.lat != null && input.lon != null && input.playgroundId != null) {
		const [playground] = await db
			.select({
				location: sql<string | null>`ST_AsText(\`playgrounds\`.\`location\`)`.mapWith((v) =>
					v == null ? null : String(v)
				)
			})
			.from(playgrounds)
			.where(eq(playgrounds.id, input.playgroundId))
			.limit(1);

		const coords = parsePointLatLon(playground?.location);
		if (coords && isNearPlayground({ lat: input.lat, lon: input.lon }, coords)) {
			karmaToAdd += 1;
		}
	}

	if (input.userId != null) karmaToAdd += 1;

	if (karmaToAdd > 0) {
		await db
			.update(uuidKarmas)
			.set({ karma: sql`${uuidKarmas.karma} + ${karmaToAdd}` })
			.where(eq(uuidKarmas.uuid, input.uuid));
	}
}

export async function submitScoreReport(
	input: SubmitScoreReportInput
): Promise<SubmitScoreReportResult> {
	const now = input.now ?? new Date();

	if (!isValidUuidCookie(input.uuid)) {
		return { ok: false, error: 'uuid' };
	}

	const game = await findGameForReport(input.gameId);
	if (!game) return { ok: false, error: 'not_found' };

	const kickoff = naiveToIso(game.date);
	const href = gamePublicHref(game);
	const redirectTo = safeReturnTo(input.returnTo, input.origin, href);

	if (!input.user) {
		const captchaOk = await verifyRecaptcha(input.recaptchaToken, input.ipAddress);
		if (!captchaOk) return { ok: false, error: 'captcha' };
	} else {
		await ensureUserUuid(input.user.id, input.uuid);
	}

	const scores = validateScores(input.homeScore, input.awayScore);
	if (!scores.ok) {
		if (scores.reason === 'ridiculous') {
			await createRidiculousBan({
				uuid: input.uuid,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
				homeClubName: game.homeClubName,
				awayClubName: game.awayClubName,
				now
			});
			return { ok: false, error: 'banned', banCreated: true };
		}
		return { ok: false, error: 'invalid' };
	}

	if (!allowScoreReports(kickoff, now)) {
		return { ok: false, error: 'closed' };
	}

	const finishedAllowed = canMarkFinished(kickoff, now);
	const finished = finishedAllowed && input.finished;

	const bans = await loadActiveBans({
		uuid: input.uuid,
		userId: input.user?.id ?? null,
		ipAddress: input.ipAddress || null
	});
	const matched = findMatchingBan(bans, {
		uuid: input.uuid,
		userId: input.user?.id ?? null,
		ipAddress: input.ipAddress || null,
		userAgent: input.userAgent
	});

	if (matched) {
		if (matched.shadowBan) {
			return {
				ok: true,
				redirectTo,
				messageKey: 'shadow',
				homeScore: scores.homeScore,
				awayScore: scores.awayScore
			};
		}
		return { ok: false, error: 'banned' };
	}

	const userMatch =
		input.user != null ? eq(scoreReports.userId, input.user.id) : sql`false`;
	const [same] = await db
		.select({ id: scoreReports.id })
		.from(scoreReports)
		.where(
			and(
				eq(scoreReports.gameId, game.id),
				eq(scoreReports.homeScore, scores.homeScore),
				eq(scoreReports.awayScore, scores.awayScore),
				eq(scoreReports.finished, finished),
				or(userMatch, eq(scoreReports.uuid, input.uuid))
			)
		)
		.limit(1);
	if (same) return { ok: false, error: 'duplicate' };

	const oneMinuteAgo = new Date(now.getTime() - 60_000);
	const fourMinutesAgo = new Date(now.getTime() - 4 * 60_000);

	let recentByUser = false;
	if (input.user) {
		const [row] = await db
			.select({ id: scoreReports.id })
			.from(scoreReports)
			.where(
				and(
					eq(scoreReports.userId, input.user.id),
					eq(scoreReports.source, 'website'),
					gt(scoreReports.createdAt, oneMinuteAgo)
				)
			)
			.limit(1);
		recentByUser = Boolean(row);
	}

	const [recentUuid] = await db
		.select({ id: scoreReports.id })
		.from(scoreReports)
		.where(
			and(
				eq(scoreReports.uuid, input.uuid),
				eq(scoreReports.source, 'website'),
				gt(scoreReports.createdAt, fourMinutesAgo)
			)
		)
		.limit(1);

	const [ipCountRow] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(scoreReports)
		.where(
			and(
				eq(scoreReports.ipAddress, input.ipAddress),
				eq(scoreReports.source, 'website'),
				eq(scoreReports.gameId, game.id),
				gt(scoreReports.createdAt, fourMinutesAgo)
			)
		);

	const rate = checkRateLimits({
		recentByUser,
		recentByUuid: Boolean(recentUuid),
		recentByIpCount: ipCountRow?.count ?? 0
	});
	if (!rate.ok) {
		return {
			ok: false,
			error: rate.reason === 'recent_ip' ? 'recent_ip' : 'recent'
		};
	}

	const lat = parseOptionalCoord(input.latitude);
	const lon = parseOptionalCoord(input.longitude);
	const accuracy = clampLocationAccuracy(parseOptionalCoord(input.accuracy));
	const hasLocation = lat != null && lon != null;

	const ipCountry = input.ipCountry ? limit(input.ipCountry, 155) : null;
	const ip = limit(input.ipAddress || '', 45);
	const ua = input.userAgent ? limit(input.userAgent, 255) : null;

	if (hasLocation) {
		await db.execute(sql`
			INSERT INTO score_reports (
				user_id, game_id, home_score, away_score, source,
				ip_address, ip_country, user_agent, location, location_accuracy,
				uuid, finished, is_fake, is_correct, created_at, updated_at
			) VALUES (
				${input.user?.id ?? null},
				${game.id},
				${scores.homeScore},
				${scores.awayScore},
				${'website'},
				${ip || null},
				${ipCountry},
				${ua},
				ST_GeomFromText(${`POINT(${lat} ${lon})`}),
				${accuracy},
				${limit(input.uuid, 36)},
				${finished},
				${false},
				${false},
				${now},
				${now}
			)
		`);
	} else {
		await db.insert(scoreReports).values({
			userId: input.user?.id ?? null,
			gameId: game.id,
			homeScore: scores.homeScore,
			awayScore: scores.awayScore,
			source: 'website',
			ipAddress: ip || null,
			ipCountry,
			userAgent: ua,
			locationAccuracy: accuracy,
			uuid: limit(input.uuid, 36),
			finished,
			isFake: false,
			isCorrect: false,
			createdAt: now,
			updatedAt: now
		});
	}

	await handleKarma({
		uuid: limit(input.uuid, 36),
		userId: input.user?.id ?? null,
		lat,
		lon,
		playgroundId: game.playgroundId
	});

	return {
		ok: true,
		redirectTo,
		messageKey: hasLocation ? 'success' : 'success_no_location',
		homeScore: scores.homeScore,
		awayScore: scores.awayScore
	};
}
