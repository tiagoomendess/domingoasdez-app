/**
 * Server helpers for the game detail page.
 * Ports Front\GamesController@show + MvpVotesController@vote.
 */
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import type { AuthUser } from '#lib/auth/user.ts';
import { formatSeasonShort, seasonNameSlug } from '#lib/competitions.ts';
import type { Match } from '#lib/components/types.ts';
import {
	allowScoreReports,
	competitionHref,
	formResult,
	gameHref,
	gameStatus,
	hasStarted,
	headToHeadStats,
	isMvpVoteOpen,
	type FormResult,
	type HeadToHeadStats
} from '#lib/games.ts';
import { isAdult, playerDisplayName } from '#lib/players.ts';
import { slugify } from '#lib/slug.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { naiveToIso } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameComments,
	gameGroups,
	gameReferees,
	games,
	goals,
	mvpVotes,
	players,
	playgrounds,
	refereeTypes,
	referees,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import type { ResolvedSeason } from '#lib/server/competition-page.ts';
import { emblemUrl, goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { mediaUrl, placeholder16x9, profilePicture } from '#lib/server/media.ts';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

function displayName(seasonName: string | null, competitionName: string): string {
	return seasonName?.trim() || competitionName;
}

function displayPicture(
	seasonPicture: string | null,
	competitionPicture: string | null
): string | null {
	return mediaUrl(seasonPicture?.trim() || competitionPicture);
}

function clubHref(clubName: string): string {
	return `/clubes/${slugify(clubName)}`;
}

function playerHref(id: number, name: string): string {
	return `/jogadores/${id}/${slugify(name)}`;
}

function refereeHref(id: number, name: string): string {
	return `/arbitros/${id}/${slugify(name)}`;
}

/** Parse MySQL `POINT(lat lon)` from ST_AsText. Legacy stores latitude first. */
export function parsePointLatLon(
	wkt: string | null | undefined
): { lat: number; lon: number } | null {
	if (!wkt) return null;
	const match = /^POINT\(([-\d.]+)\s+([-\d.]+)\)$/i.exec(wkt.trim());
	if (!match) return null;
	const lat = Number(match[1]);
	const lon = Number(match[2]);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
	return { lat, lon };
}

export type GameSlugParams = {
	seasonSlug: string;
	competitionSlug: string;
	groupSlug: string;
	round: number;
	homeClubSlug: string;
	awayClubSlug: string;
};

export type ResolvedGame = {
	id: number;
	round: number;
	date: string | Date;
	goalsHome: number | null;
	goalsAway: number | null;
	penaltiesHome: number | null;
	penaltiesAway: number | null;
	finished: boolean;
	visible: boolean;
	postponed: boolean;
	image: string | null;
	playgroundId: number | null;
	homeTeamId: number;
	awayTeamId: number;
	homeTeamContactEmail: string | null;
	awayTeamContactEmail: string | null;
	homeClubName: string;
	homeClubEmblem: string | null;
	homeClubContactEmail: string | null;
	awayClubName: string;
	awayClubEmblem: string | null;
	awayClubContactEmail: string | null;
	groupId: number;
	groupName: string | null;
	season: ResolvedSeason;
};

export type GameGoalView = {
	id: number;
	minute: number | null;
	ownGoal: boolean;
	penalty: boolean;
	playerName: string;
	picture: string;
	href: string | null;
};

export type GameRefereeView = {
	id: number;
	name: string;
	picture: string;
	typeKey: string;
	href: string;
};

export type FormChip = {
	result: FormResult;
	href: string;
};

export type MvpPlayerView = {
	id: number;
	name: string;
	picture: string;
};

export type GamePageData = {
	id: number;
	href: string;
	competitionHref: string;
	displayName: string;
	displayEmblem: string | null;
	groupName: string;
	round: number;
	seasonLabel: string;
	kickoff: string;
	status: ReturnType<typeof gameStatus>;
	showScore: boolean;
	homeScore: number;
	awayScore: number;
	penalties: { home: number; away: number } | null;
	home: { name: string; emblem: string | null; href: string };
	away: { name: string; emblem: string | null; href: string };
	venue: {
		name: string;
		picture: string;
		googleMapsUrl: string | null;
		wazeUrl: string | null;
	} | null;
	coverPicture: string;
	homeGoals: GameGoalView[];
	awayGoals: GameGoalView[];
	referees: GameRefereeView[];
	homeForm: FormChip[];
	awayForm: FormChip[];
	pastGames: Match[];
	pastGamesShown: Match[];
	remainingPastGamesCount: number;
	h2hStats: HeadToHeadStats | null;
	mvp: {
		voteOpen: boolean;
		winner: MvpPlayerView | null;
		userVote: MvpPlayerView | null;
		homePlayers: MvpPlayerView[];
		awayPlayers: MvpPlayerView[];
	};
	links: {
		scoreReport: string | null;
		flashInterview: string | null;
		editGame: string | null;
		addHomeGoal: string | null;
		addAwayGoal: string | null;
		scoreReportsList: string | null;
	};
	seo: {
		title: string;
		description: string;
		ogImage: string | null;
	};
};

function splitClubsSlug(clubsSlug: string): [string, string] | null {
	const idx = clubsSlug.indexOf('-vs-');
	if (idx <= 0) return null;
	const home = clubsSlug.slice(0, idx);
	const away = clubsSlug.slice(idx + 4);
	if (!home || !away) return null;
	return [home, away];
}

export function parseClubsSlug(
	clubsSlug: string
): { homeClubSlug: string; awayClubSlug: string } | null {
	const parts = splitClubsSlug(clubsSlug);
	if (!parts) return null;
	return { homeClubSlug: parts[0], awayClubSlug: parts[1] };
}

/**
 * Resolve a visible game from season/competition/group/round/clubs slugs.
 * Season must already be resolved via findSeasonBySlugs.
 */
export async function findGameBySlugs(
	season: ResolvedSeason,
	groupSlug: string,
	round: number,
	homeClubSlug: string,
	awayClubSlug: string
): Promise<ResolvedGame | null> {
	const display = displayName(season.name, season.competitionName);

	const rows = await db
		.select({
			id: games.id,
			round: games.round,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			finished: games.finished,
			visible: games.visible,
			postponed: games.postponed,
			image: games.image,
			playgroundId: games.playgroundId,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			homeTeamContactEmail: homeTeam.contactEmail,
			awayTeamContactEmail: awayTeam.contactEmail,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			homeClubContactEmail: homeClub.contactEmail,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem,
			awayClubContactEmail: awayClub.contactEmail,
			groupId: gameGroups.id,
			groupName: gameGroups.name
		})
		.from(games)
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(
			and(eq(gameGroups.seasonId, season.id), eq(games.round, round), eq(games.visible, true))
		);

	for (const row of rows) {
		const groupName = row.groupName?.trim() || display;
		if (slugify(groupName) !== groupSlug) continue;
		if (slugify(row.homeClubName) !== homeClubSlug) continue;
		if (slugify(row.awayClubName) !== awayClubSlug) continue;

		return {
			...row,
			finished: Boolean(row.finished),
			visible: Boolean(row.visible),
			postponed: Boolean(row.postponed),
			season
		};
	}

	return null;
}

async function loadVenue(playgroundId: number | null, gameId: number) {
	if (playgroundId == null) {
		return {
			venue: null as GamePageData['venue'],
			coverPicture: placeholder16x9(gameId)
		};
	}

	const [row] = await db
		.select({
			id: playgrounds.id,
			name: playgrounds.name,
			picture: playgrounds.picture,
			location: sql<string | null>`ST_AsText(\`playgrounds\`.\`location\`)`.mapWith((v) =>
				v == null ? null : String(v)
			)
		})
		.from(playgrounds)
		.where(eq(playgrounds.id, playgroundId))
		.limit(1);

	if (!row) {
		return { venue: null, coverPicture: placeholder16x9(gameId) };
	}

	const coords = parsePointLatLon(row.location);
	const picture = row.picture?.trim() ? mediaUrl(row.picture)! : placeholder16x9(row.id);

	return {
		venue: {
			name: row.name,
			picture,
			googleMapsUrl: coords
				? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
				: null,
			wazeUrl: coords ? `https://www.waze.com/ul?ll=${coords.lat},${coords.lon}&navigate=yes` : null
		},
		coverPicture: picture
	};
}

async function loadGoalsForGame(
	gameId: number,
	homeTeamId: number,
	awayTeamId: number,
	canEditGoals: boolean
): Promise<{ homeGoals: GameGoalView[]; awayGoals: GameGoalView[] }> {
	const rows = await db
		.select({
			id: goals.id,
			teamId: goals.teamId,
			minute: goals.minute,
			ownGoal: goals.ownGoal,
			penalty: goals.penalty,
			playerId: players.id,
			playerName: players.name,
			playerNickname: players.nickname,
			playerPicture: players.picture
		})
		.from(goals)
		.leftJoin(players, eq(goals.playerId, players.id))
		.where(and(eq(goals.gameId, gameId), eq(goals.visible, true)))
		.orderBy(asc(goals.minute), asc(goals.id));

	const homeGoals: GameGoalView[] = [];
	const awayGoals: GameGoalView[] = [];

	for (const row of rows) {
		const name = row.playerName ? playerDisplayName(row.playerName, row.playerNickname) : ''; // filled via i18n on the client for unknown — keep sentinel
		const view: GameGoalView = {
			id: row.id,
			minute: row.minute,
			ownGoal: row.ownGoal,
			penalty: row.penalty,
			playerName: name || '__unknown__',
			picture: profilePicture(row.playerPicture),
			href: canEditGoals
				? legacyUrl(`/goals/${row.id}`)
				: row.playerId && row.playerName
					? playerHref(row.playerId, row.playerName)
					: null
		};
		if (row.teamId === homeTeamId) homeGoals.push(view);
		else if (row.teamId === awayTeamId) awayGoals.push(view);
	}

	return { homeGoals, awayGoals };
}

async function loadReferees(gameId: number): Promise<GameRefereeView[]> {
	const rows = await db
		.select({
			id: referees.id,
			name: referees.name,
			picture: referees.picture,
			typeKey: refereeTypes.name
		})
		.from(gameReferees)
		.innerJoin(referees, eq(gameReferees.refereeId, referees.id))
		.innerJoin(refereeTypes, eq(gameReferees.refereeTypeId, refereeTypes.id))
		.where(eq(gameReferees.gameId, gameId))
		.orderBy(asc(gameReferees.id));

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		picture: profilePicture(row.picture),
		typeKey: row.typeKey,
		href: refereeHref(row.id, row.name)
	}));
}

type TeamGameRow = {
	id: number;
	round: number;
	date: string | Date;
	goalsHome: number | null;
	goalsAway: number | null;
	penaltiesHome: number | null;
	penaltiesAway: number | null;
	finished: boolean;
	postponed: boolean;
	homeTeamId: number;
	awayTeamId: number;
	groupName: string | null;
	startYear: number;
	endYear: number;
	seasonName: string | null;
	competitionName: string;
	homeClubName: string;
	homeClubEmblem: string | null;
	awayClubName: string;
	awayClubEmblem: string | null;
};

async function loadTeamLastGames(
	teamId: number,
	beforeDate: string | Date,
	limit = 4
): Promise<TeamGameRow[]> {
	const beforeNaive =
		beforeDate instanceof Date
			? beforeDate.toISOString().slice(0, 19).replace('T', ' ')
			: String(beforeDate).slice(0, 19).replace('T', ' ');

	return db
		.select({
			id: games.id,
			round: games.round,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			finished: games.finished,
			postponed: games.postponed,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			groupName: gameGroups.name,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			seasonName: seasons.name,
			competitionName: competitions.name,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem
		})
		.from(games)
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(seasons, eq(gameGroups.seasonId, seasons.id))
		.innerJoin(competitions, eq(seasons.competitionId, competitions.id))
		.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(
			and(
				eq(games.visible, true),
				eq(games.finished, true),
				sql`${games.date} < ${beforeNaive}`,
				or(eq(games.homeTeamId, teamId), eq(games.awayTeamId, teamId))
			)
		)
		.orderBy(desc(games.date))
		.limit(limit);
}

async function loadPastH2H(
	homeTeamId: number,
	awayTeamId: number,
	beforeDate: string | Date
): Promise<TeamGameRow[]> {
	const beforeNaive =
		beforeDate instanceof Date
			? beforeDate.toISOString().slice(0, 19).replace('T', ' ')
			: String(beforeDate).slice(0, 19).replace('T', ' ');

	return db
		.select({
			id: games.id,
			round: games.round,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			finished: games.finished,
			postponed: games.postponed,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			groupName: gameGroups.name,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			seasonName: seasons.name,
			competitionName: competitions.name,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem
		})
		.from(games)
		.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
		.innerJoin(seasons, eq(gameGroups.seasonId, seasons.id))
		.innerJoin(competitions, eq(seasons.competitionId, competitions.id))
		.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
		.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
		.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
		.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
		.where(
			and(
				eq(games.visible, true),
				eq(games.finished, true),
				sql`${games.date} < ${beforeNaive}`,
				or(
					and(eq(games.homeTeamId, homeTeamId), eq(games.awayTeamId, awayTeamId)),
					and(eq(games.homeTeamId, awayTeamId), eq(games.awayTeamId, homeTeamId))
				)
			)
		)
		.orderBy(desc(games.date));
}

function toMatch(row: TeamGameRow, counts: Map<number, Map<number, number>>, now: Date): Match {
	const kickoff = naiveToIso(row.date);
	const status = gameStatus(
		{ kickoffIso: kickoff, finished: row.finished, postponed: row.postponed },
		now
	);
	const { homeScore, awayScore } = resolveScores(row, counts);
	const display = displayName(row.seasonName, row.competitionName);
	const groupName = row.groupName?.trim() || display;
	const showScore = status === 'live' || status === 'finished';
	const decidedByPenalties =
		showScore && homeScore === awayScore && row.penaltiesHome != null && row.penaltiesAway != null;

	return {
		id: row.id,
		href: gameHref({
			startYear: row.startYear,
			endYear: row.endYear,
			displayName: display,
			groupName,
			round: row.round,
			homeClubName: row.homeClubName,
			awayClubName: row.awayClubName
		}),
		status,
		kickoff,
		home: { name: row.homeClubName, emblem: emblemUrl(row.homeClubEmblem) },
		away: { name: row.awayClubName, emblem: emblemUrl(row.awayClubEmblem) },
		homeScore: showScore ? homeScore : null,
		awayScore: showScore ? awayScore : null,
		penalties: decidedByPenalties ? { home: row.penaltiesHome!, away: row.penaltiesAway! } : null
	};
}

function toFormChips(
	rows: TeamGameRow[],
	teamId: number,
	counts: Map<number, Map<number, number>>,
	now: Date
): FormChip[] {
	if (rows.length <= 1) return [];
	return rows.map((row) => {
		const { homeScore, awayScore } = resolveScores(row, counts);
		const match = toMatch(row, counts, now);
		return {
			result: formResult(
				{
					homeTeamId: row.homeTeamId,
					awayTeamId: row.awayTeamId,
					homeScore,
					awayScore
				},
				teamId
			),
			href: match.href
		};
	});
}

async function loadMvpBlock(
	game: ResolvedGame,
	user: AuthUser | null,
	perms: Set<string>,
	kickoffIso: string,
	now: Date
): Promise<GamePageData['mvp']> {
	const voteOpen = isMvpVoteOpen(kickoffIso, now);
	const canSeeUnderagePics = hasPermission(perms, 'players');

	const [topVote] = await db
		.select({
			playerId: mvpVotes.playerId,
			amount: sql<number>`count(${mvpVotes.playerId})`.mapWith(Number)
		})
		.from(mvpVotes)
		.where(eq(mvpVotes.gameId, game.id))
		.groupBy(mvpVotes.playerId)
		.orderBy(desc(sql`count(${mvpVotes.playerId})`))
		.limit(1);

	let winner: MvpPlayerView | null = null;
	if (game.finished && !voteOpen && topVote && topVote.amount >= 1) {
		const [player] = await db
			.select({
				id: players.id,
				name: players.name,
				nickname: players.nickname,
				picture: players.picture,
				birthDate: players.birthDate
			})
			.from(players)
			.where(eq(players.id, topVote.playerId))
			.limit(1);
		if (player) {
			const showPic = canSeeUnderagePics || isAdult(player.birthDate, now);
			winner = {
				id: player.id,
				name: playerDisplayName(player.name, player.nickname),
				picture: profilePicture(showPic ? player.picture : null)
			};
		}
	}

	let userVote: MvpPlayerView | null = null;
	if (user) {
		const [vote] = await db
			.select({
				playerId: mvpVotes.playerId,
				name: players.name,
				nickname: players.nickname,
				picture: players.picture,
				birthDate: players.birthDate
			})
			.from(mvpVotes)
			.innerJoin(players, eq(mvpVotes.playerId, players.id))
			.where(and(eq(mvpVotes.gameId, game.id), eq(mvpVotes.userId, user.id)))
			.limit(1);
		if (vote) {
			const showPic = canSeeUnderagePics || isAdult(vote.birthDate, now);
			userVote = {
				id: vote.playerId,
				name: playerDisplayName(vote.name, vote.nickname),
				picture: profilePicture(showPic ? vote.picture : null)
			};
		}
	}

	let homePlayers: MvpPlayerView[] = [];
	let awayPlayers: MvpPlayerView[] = [];

	if (voteOpen && !userVote) {
		const roster = await db
			.select({
				id: players.id,
				teamId: players.teamId,
				name: players.name,
				nickname: players.nickname,
				picture: players.picture,
				birthDate: players.birthDate
			})
			.from(players)
			.where(
				and(inArray(players.teamId, [game.homeTeamId, game.awayTeamId]), eq(players.visible, true))
			)
			.orderBy(asc(players.name));

		for (const p of roster) {
			const showPic = canSeeUnderagePics || isAdult(p.birthDate, now);
			const view: MvpPlayerView = {
				id: p.id,
				name: playerDisplayName(p.name, p.nickname),
				picture: profilePicture(showPic ? p.picture : null)
			};
			if (p.teamId === game.homeTeamId) homePlayers.push(view);
			else if (p.teamId === game.awayTeamId) awayPlayers.push(view);
		}
	}

	return { voteOpen, winner, userVote, homePlayers, awayPlayers };
}

async function loadFlashInterviewLink(
	game: ResolvedGame,
	user: AuthUser | null
): Promise<string | null> {
	if (!user?.email) return null;

	const homeEmail = game.homeTeamContactEmail?.trim() || game.homeClubContactEmail?.trim() || null;
	const awayEmail = game.awayTeamContactEmail?.trim() || game.awayClubContactEmail?.trim() || null;

	let teamId: number | null = null;
	if (homeEmail && user.email.toLowerCase() === homeEmail.toLowerCase()) {
		teamId = game.homeTeamId;
	} else if (awayEmail && user.email.toLowerCase() === awayEmail.toLowerCase()) {
		teamId = game.awayTeamId;
	}
	if (teamId == null) return null;

	const [comment] = await db
		.select({ uuid: gameComments.uuid, pin: gameComments.pin })
		.from(gameComments)
		.where(and(eq(gameComments.gameId, game.id), eq(gameComments.teamId, teamId)))
		.limit(1);

	if (!comment) return null;
	return `/flash-interview/${comment.uuid}?pin=${encodeURIComponent(comment.pin)}`;
}

/** Full page payload for the game detail route. */
export async function loadGamePage(
	game: ResolvedGame,
	user: AuthUser | null,
	pageUrl: string,
	now = new Date()
): Promise<GamePageData> {
	const season = game.season;
	const display = displayName(season.name, season.competitionName);
	const groupName = game.groupName?.trim() || display;
	const kickoff = naiveToIso(game.date);
	const status = gameStatus(
		{ kickoffIso: kickoff, finished: game.finished, postponed: game.postponed },
		now
	);
	const started = hasStarted(kickoff, now);
	const showScore = !game.postponed && started;

	const perms = user ? await getUserPermissionNames(user.id) : new Set<string>();
	const canEditGames = hasPermission(perms, 'games.edit');
	const canCreateGoals = hasPermission(perms, 'goals.create');
	const canScoreUpdate = hasPermission(perms, 'score_update');
	const canEditGoals =
		hasPermission(perms, 'admin') || [...perms].some((p) => p.startsWith('goals.edit.'));

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

	const decidedByPenalties =
		showScore &&
		homeScore === awayScore &&
		game.penaltiesHome != null &&
		game.penaltiesAway != null;

	const [{ venue, coverPicture }, goalsData, refs, flashInterview] = await Promise.all([
		loadVenue(game.playgroundId, game.id),
		loadGoalsForGame(game.id, game.homeTeamId, game.awayTeamId, canEditGoals),
		loadReferees(game.id),
		loadFlashInterviewLink(game, user)
	]);

	const loadForm = !started && !game.finished;
	const [homeLast, awayLast, pastRows] = await Promise.all([
		loadForm ? loadTeamLastGames(game.homeTeamId, game.date) : Promise.resolve([]),
		loadForm ? loadTeamLastGames(game.awayTeamId, game.date) : Promise.resolve([]),
		loadPastH2H(game.homeTeamId, game.awayTeamId, game.date)
	]);

	const formIds = [...homeLast, ...awayLast, ...pastRows]
		.filter((r) => r.goalsHome == null || r.goalsAway == null)
		.map((r) => r.id);
	const formCounts = await goalCountsByGame(formIds);

	const homeForm = toFormChips(homeLast, game.homeTeamId, formCounts, now);
	const awayForm = toFormChips(awayLast, game.awayTeamId, formCounts, now);

	const pastMatches = pastRows.map((row) => toMatch(row, formCounts, now));
	const h2hInput = pastRows.map((row) => {
		const scores = resolveScores(row, formCounts);
		return {
			homeTeamId: row.homeTeamId,
			awayTeamId: row.awayTeamId,
			homeScore: scores.homeScore,
			awayScore: scores.awayScore
		};
	});
	const h2hStats = pastRows.length > 0 ? headToHeadStats(h2hInput, game.homeTeamId) : null;

	const isGuest = !user;
	const maxShown = isGuest ? 2 : pastMatches.length;
	const pastGamesShown = pastMatches.slice(0, maxShown);
	const remainingPastGamesCount = Math.max(0, pastMatches.length - maxShown);

	const mvp = await loadMvpBlock(game, user, perms, kickoff, now);

	const href = gameHref({
		startYear: season.startYear,
		endYear: season.endYear,
		displayName: display,
		groupName,
		round: game.round,
		homeClubName: game.homeClubName,
		awayClubName: game.awayClubName
	});

	const seasonLabel = formatSeasonShort(season.startYear, season.endYear);
	const returnTo = encodeURIComponent(pageUrl);

	return {
		id: game.id,
		href,
		competitionHref: competitionHref({
			startYear: season.startYear,
			endYear: season.endYear,
			displayName: display
		}),
		displayName: display,
		displayEmblem: displayPicture(season.picture, season.competitionPicture),
		groupName,
		round: game.round,
		seasonLabel,
		kickoff,
		status,
		showScore,
		homeScore,
		awayScore,
		penalties: decidedByPenalties ? { home: game.penaltiesHome!, away: game.penaltiesAway! } : null,
		home: {
			name: game.homeClubName,
			emblem: emblemUrl(game.homeClubEmblem),
			href: clubHref(game.homeClubName)
		},
		away: {
			name: game.awayClubName,
			emblem: emblemUrl(game.awayClubEmblem),
			href: clubHref(game.awayClubName)
		},
		venue,
		coverPicture,
		homeGoals: goalsData.homeGoals,
		awayGoals: goalsData.awayGoals,
		referees: refs,
		homeForm,
		awayForm,
		pastGames: pastMatches,
		pastGamesShown,
		remainingPastGamesCount,
		h2hStats,
		mvp,
		links: {
			scoreReport: allowScoreReports(kickoff, now)
				? `/score-reports/${game.id}?returnTo=${encodeURIComponent(href)}`
				: null,
			flashInterview,
			editGame: canEditGames ? legacyUrl(`/games/${game.id}/edit`) : null,
			addHomeGoal: canCreateGoals
				? legacyUrl(`/goals/create?game_id=${game.id}&team_id=${game.homeTeamId}`)
				: null,
			addAwayGoal: canCreateGoals
				? legacyUrl(`/goals/create?game_id=${game.id}&team_id=${game.awayTeamId}`)
				: null,
			scoreReportsList: canScoreUpdate
				? legacyUrl(`/jogos/${game.id}/resultados-enviados?back_to=${returnTo}`)
				: null
		},
		seo: {
			title: `${game.homeClubName} vs ${game.awayClubName} - ${display} ${seasonLabel}`,
			description: `Jogo da ${display} na época ${seasonLabel}`,
			ogImage:
				mediaUrl(game.image?.trim()) || displayPicture(season.picture, season.competitionPicture)
		}
	};
}

export type CastMvpVoteResult =
	{ ok: true } | { ok: false; reason: 'closed' | 'already_voted' | 'invalid_player' | 'not_found' };

export async function castMvpVote(input: {
	gameId: number;
	playerId: number;
	userId: number;
	now?: Date;
}): Promise<CastMvpVoteResult> {
	const now = input.now ?? new Date();

	const [game] = await db
		.select({
			id: games.id,
			date: games.date,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			visible: games.visible
		})
		.from(games)
		.where(eq(games.id, input.gameId))
		.limit(1);

	if (!game || !game.visible) return { ok: false, reason: 'not_found' };

	const [existing] = await db
		.select({ id: mvpVotes.id })
		.from(mvpVotes)
		.where(and(eq(mvpVotes.gameId, input.gameId), eq(mvpVotes.userId, input.userId)))
		.limit(1);
	if (existing) return { ok: false, reason: 'already_voted' };

	const kickoff = naiveToIso(game.date);
	if (!isMvpVoteOpen(kickoff, now)) return { ok: false, reason: 'closed' };

	const [player] = await db
		.select({ id: players.id, teamId: players.teamId })
		.from(players)
		.where(eq(players.id, input.playerId))
		.limit(1);

	if (!player || (player.teamId !== game.homeTeamId && player.teamId !== game.awayTeamId)) {
		return { ok: false, reason: 'invalid_player' };
	}

	await db.insert(mvpVotes).values({
		gameId: input.gameId,
		playerId: input.playerId,
		userId: input.userId
	});

	return { ok: true };
}

export function canonicalGamePath(page: {
	startYear: number;
	endYear: number;
	displayName: string;
	groupName: string;
	round: number;
	homeClubName: string;
	awayClubName: string;
}): string {
	return gameHref(page);
}

export { seasonNameSlug, displayName };
