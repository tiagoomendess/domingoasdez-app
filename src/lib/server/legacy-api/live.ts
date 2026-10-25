/**
 * Ports Api\GamesController@getLiveMatches (`GET /api/games/live`): today's games in their live
 * window, grouped by game group, cached 30 s. External scripts read it, so the shape is the
 * legacy one key for key.
 *
 * - "Today" is the UTC day (the legacy app timezone), from 00:00:00 to 23:59:59, both exclusive,
 *   in id order (the legacy query has no ORDER BY and no date index, so MySQL scans by id).
 * - Live means visible, not postponed, and now strictly between kick-off − 30 min and
 *   kick-off + 3 h (Game::getLiveGames). Finished games still count.
 */
import { and, asc, eq, gt, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { gameHref } from '#lib/games.ts';
import { nowNaiveUtc } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, competitions, gameGroups, games, seasons, teams } from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { legacyDisplayName, legacyDisplayPicture, legacySeasonName } from './competitions.ts';
import { legacyEmblem } from './games.ts';
import { phpRtrim } from './php.ts';

const CACHE_TTL_MS = 30_000;
const WARMUP_SECONDS = 30 * 60;
const LIVE_SECONDS = 3 * 60 * 60;

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

// ---------------------------------------------------------------------------------------------
// Short club names ("CAM" for "GDR Campo")

/**
 * The legacy pattern `/[A-Z\Á][a-z\ç\ã\õ\á]+$/`, written in a UTF-8 PHP file and run without
 * the `u` flag: the accented letters are their UTF-8 bytes inside the classes, so it matches
 * bytes, not characters. Run here on the name's bytes as latin1 code units.
 */
const SMALL_NAME_PATTERN = /[A-Z\xC3\x81][a-z\xC3\xA7\xA3\xB5\xA1]+(?=\n?$)/;

/** UTF-8 bytes as latin1 code units, and back. */
function toByteString(value: string): string {
	return Buffer.from(value, 'utf8').toString('latin1');
}

/** mbstring's view of bytes: UTF-8 characters, each invalid byte replaced with "?". */
function mbChars(byteString: string): string[] {
	const decoded = new TextDecoder('utf-8').decode(Buffer.from(byteString, 'latin1'));
	return Array.from(decoded.replaceAll('�', '?'));
}

/**
 * `str_replace('...', '', Str::limit($value, 3))`: up to 3 characters, right-trimmed when cut.
 * Legacy kept a short match with a stray byte as is, and json_encode then failed with a 500;
 * that byte becomes "?" here too, as mbstring does when it cuts.
 */
function limit3(byteString: string): string {
	const chars = mbChars(byteString);
	const limited = chars.length <= 3 ? chars.join('') : `${phpRtrim(chars.slice(0, 3).join(''))}...`;
	return limited.replaceAll('...', '');
}

/** The legacy `*_club_name_small`: ASCII-only uppercase (strtoupper in the C locale). */
export function liveSmallName(clubName: string): string {
	const bytes = toByteString(clubName);
	const match = SMALL_NAME_PATTERN.exec(bytes);
	const small = limit3(match ? match[0] : bytes);
	return small.replace(/[a-z]+/g, (s) => s.toUpperCase());
}

// ---------------------------------------------------------------------------------------------

type LiveRow = Awaited<ReturnType<typeof loadTodayRows>>[number];

function loadTodayRows(day: string) {
	return db
		.select({
			id: games.id,
			gameGroupId: games.gameGroupId,
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
			seasonName: seasons.name,
			seasonPicture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			competitionName: competitions.name,
			competitionPicture: competitions.picture,
			homeTeamName: homeTeam.name,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayTeamName: awayTeam.name,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem
		})
		.from(games)
		.innerJoin(gameGroups, eq(gameGroups.id, games.gameGroupId))
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.innerJoin(homeTeam, eq(homeTeam.id, games.homeTeamId))
		.innerJoin(homeClub, eq(homeClub.id, homeTeam.clubId))
		.innerJoin(awayTeam, eq(awayTeam.id, games.awayTeamId))
		.innerJoin(awayClub, eq(awayClub.id, awayTeam.clubId))
		.where(
			and(
				gt(games.date, new Date(`${day}T00:00:00Z`)),
				lt(games.date, new Date(`${day}T23:59:59Z`)),
				eq(games.visible, true)
			)
		)
		.orderBy(asc(games.id));
}

/** Game::isDraw: the stored goals when both are set, else the goal rows. */
function isDraw(row: LiveRow, counts: Map<number, Map<number, number>>): boolean {
	if (row.goalsHome != null && row.goalsAway != null) return row.goalsHome === row.goalsAway;
	const byTeam = counts.get(row.id);
	return (byTeam?.get(row.homeTeamId) ?? 0) === (byTeam?.get(row.awayTeamId) ?? 0);
}

function toLiveGame(
	row: LiveRow,
	counts: Map<number, Map<number, number>>,
	origin: string,
	nowSeconds: number
) {
	const display = legacyDisplayName(row.seasonName, row.competitionName);
	const { homeScore, awayScore } = resolveScores(row, counts);
	const kickoffSeconds = Math.floor(new Date(row.date).getTime() / 1000);
	const decidedByPenalties =
		isDraw(row, counts) && row.penaltiesHome != null && row.penaltiesAway != null;

	return {
		home_club_name_small: liveSmallName(row.homeClubName),
		away_club_name_small: liveSmallName(row.awayClubName),
		id: row.id,
		game_link:
			origin +
			gameHref({
				startYear: row.startYear,
				endYear: row.endYear,
				displayName: display,
				// Legacy slugged a missing group name to "" (a broken link); use the canonical URL.
				groupName: row.groupName?.trim() || display,
				round: row.round,
				homeClubName: row.homeClubName,
				awayClubName: row.awayClubName
			}),
		date: nowNaiveUtc(new Date(row.date)),
		started: nowSeconds > kickoffSeconds,
		finished: row.finished,
		home_club_name: row.homeClubName,
		home_club_emblem: legacyEmblem(row.homeClubEmblem),
		home_team_name: row.homeTeamName,
		home_score: homeScore,
		away_club_name: row.awayClubName,
		away_club_emblem: legacyEmblem(row.awayClubEmblem),
		away_team_name: row.awayTeamName,
		away_score: awayScore,
		round: row.round,
		penalties: decidedByPenalties ? `(${row.penaltiesHome} - ${row.penaltiesAway} g.p)` : null
	};
}

async function buildLiveMatches(origin: string, now: Date) {
	const nowSeconds = Math.floor(now.getTime() / 1000);
	const rows = (await loadTodayRows(nowNaiveUtc(now).slice(0, 10))).filter((row) => {
		if (row.postponed) return false;
		const kickoff = Math.floor(new Date(row.date).getTime() / 1000);
		return nowSeconds > kickoff - WARMUP_SECONDS && nowSeconds < kickoff + LIVE_SECONDS;
	});

	const counts = await goalCountsByGame(rows.map((r) => r.id));

	// Collection::groupBy keeps the order in which each group first appears.
	const groups = new Map<number, LiveRow[]>();
	for (const row of rows) {
		const list = groups.get(row.gameGroupId);
		if (list) list.push(row);
		else groups.set(row.gameGroupId, [row]);
	}

	return {
		data: [...groups.values()].map((group) => {
			const first = group[0];
			return {
				competition_name: legacyDisplayName(first.seasonName, first.competitionName),
				game_group_name: first.groupName,
				competition_logo: legacyDisplayPicture(first.seasonPicture, first.competitionPicture),
				season_name: legacySeasonName(first.startYear, first.endYear),
				games: group.map((row) => toLiveGame(row, counts, origin, nowSeconds))
			};
		})
	};
}

let cache: { origin: string; expiresAt: number; body: unknown } | null = null;

/** The `live_matches` response, rebuilt at most every 30 s like the legacy file cache. */
export async function liveMatches(origin: string, now = new Date()) {
	if (cache && cache.origin === origin && cache.expiresAt > now.getTime()) return cache.body;
	const body = await buildLiveMatches(origin, now);
	cache = { origin, expiresAt: now.getTime() + CACHE_TTL_MS, body };
	return body;
}

export function clearLiveMatchesCache() {
	cache = null;
}
