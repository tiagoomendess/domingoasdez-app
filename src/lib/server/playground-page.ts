/**
 * Server helpers for the stadium page (`/campos/{id}/{slug}`): one `playgrounds` row, its
 * location, next game, numbers and the games played there. New in this app: the legacy site
 * had no public page for grounds.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '#lib/auth/user.ts';
import { clubHref } from '#lib/clubs.ts';
import { formatSeasonShort } from '#lib/competitions.ts';
import {
	directionsLinks,
	osmEmbedUrl,
	resultCounts,
	type PlaygroundGameItem,
	type PlaygroundGamesPage,
	type PlaygroundStats
} from '#lib/playgrounds.ts';
import { adminUrl } from '#lib/server/admin.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { naiveToIso, nowNaiveUtc } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, playgrounds } from '#lib/server/db/schema.ts';
import { parsePointLatLon } from '#lib/server/game-page.ts';
import {
	rowDisplayName,
	selectGameRows,
	toMatch,
	type TeamGameRow
} from '#lib/server/game-rows.ts';
import { emblemUrl, goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { mediaUrl, placeholder16x9 } from '#lib/server/media.ts';

/** Games per "Ver mais" page for signed-in users. */
export const PLAYGROUND_GAMES_PAGE_SIZE = 10;
/** Games a guest sees before the login prompt (as the game page's head to head). */
export const PLAYGROUND_GUEST_GAMES = 2;

/** Live window after kick-off (gameStatus), so a game being played now is still found. */
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export type PlaygroundRow = {
	id: number;
	name: string;
	clubId: number | null;
	surface: string;
	width: number | null;
	height: number | null;
	capacity: number | null;
	picture: string | null;
	obs: string | null;
	location: string | null;
};

export type PlaygroundPageData = {
	id: number;
	name: string;
	picture: string;
	surface: string | null;
	/** Pitch size in metres; `length` is the `height` column (the admin's "Comprimento"). */
	dimensions: { length: number; width: number } | null;
	capacity: number | null;
	obs: string | null;
	club: { name: string; emblem: string | null; href: string } | null;
	location: {
		lat: number;
		lon: number;
		mapUrl: string;
		googleMapsUrl: string;
		wazeUrl: string;
	} | null;
	/** A game being played here now (`live`), else the next scheduled one. */
	upcoming: { item: PlaygroundGameItem; live: boolean } | null;
	stats: PlaygroundStats | null;
	games: {
		items: PlaygroundGameItem[];
		total: number;
		/** Offset of the next page; null on the last page and for guests. */
		nextOffset: number | null;
		/** Games hidden from a guest behind the login prompt. */
		remainingCount: number;
	};
	editHref: string | null;
	seo: { title: string; ogImage: string };
};

/** A visible ground by id, or null. */
export async function findPlaygroundById(id: number): Promise<PlaygroundRow | null> {
	const [row] = await db
		.select({
			id: playgrounds.id,
			name: playgrounds.name,
			clubId: playgrounds.clubId,
			surface: playgrounds.surface,
			width: playgrounds.width,
			height: playgrounds.height,
			capacity: playgrounds.capacity,
			picture: playgrounds.picture,
			obs: playgrounds.obs,
			visible: playgrounds.visible,
			location: sql<string | null>`ST_AsText(\`playgrounds\`.\`location\`)`.mapWith((v) =>
				v == null ? null : String(v)
			)
		})
		.from(playgrounds)
		.where(eq(playgrounds.id, id))
		.limit(1);

	if (!row || !row.visible) return null;
	return row;
}

/** The games listed on the page: finished and visible, at this ground. */
function playedHere(playgroundId: number) {
	return and(
		eq(games.playgroundId, playgroundId),
		eq(games.visible, true),
		eq(games.finished, true)
	);
}

function toItem(
	row: TeamGameRow,
	counts: Map<number, Map<number, number>>,
	now: Date
): PlaygroundGameItem {
	return {
		match: toMatch(row, counts, now),
		season: formatSeasonShort(row.startYear, row.endYear),
		competition: rowDisplayName(row),
		round: row.round
	};
}

async function toItems(rows: TeamGameRow[], now: Date): Promise<PlaygroundGameItem[]> {
	const counts = await goalCountsByGame(
		rows.filter((r) => r.goalsHome == null || r.goalsAway == null).map((r) => r.id)
	);
	return rows.map((row) => toItem(row, counts, now));
}

/** One page of the games played at a ground, newest first (id breaks ties, so pages never overlap). */
async function loadGames(playgroundId: number, limit: number, offset: number, now: Date) {
	const rows = await selectGameRows(playedHere(playgroundId))
		.orderBy(desc(games.date), desc(games.id))
		.limit(limit)
		.offset(offset);
	return toItems(rows, now);
}

/** A later page for "Ver mais". Null for an unknown or hidden ground. */
export async function loadPlaygroundGamesPage(
	playgroundId: number,
	offset: number,
	now = new Date()
): Promise<PlaygroundGamesPage | null> {
	const playground = await findPlaygroundById(playgroundId);
	if (!playground) return null;

	// One extra row tells whether another page follows.
	const items = await loadGames(playgroundId, PLAYGROUND_GAMES_PAGE_SIZE + 1, offset, now);
	return {
		items: items.slice(0, PLAYGROUND_GAMES_PAGE_SIZE),
		nextOffset:
			items.length > PLAYGROUND_GAMES_PAGE_SIZE ? offset + PLAYGROUND_GAMES_PAGE_SIZE : null
	};
}

/** A game in its live window here, else the earliest scheduled one. Postponed games never count. */
async function loadUpcoming(playgroundId: number, now: Date) {
	const since = nowNaiveUtc(new Date(now.getTime() - LIVE_WINDOW_MS));
	const rows = await selectGameRows(
		and(
			eq(games.playgroundId, playgroundId),
			eq(games.visible, true),
			eq(games.finished, false),
			eq(games.postponed, false),
			sql`${games.date} > ${since}`
		)
	)
		.orderBy(asc(games.date), asc(games.id))
		.limit(5);

	const items = await toItems(rows, now);
	const live = items.find((i) => i.match.status === 'live');
	if (live) return { item: live, live: true };

	const next = items.find((i) => i.match.status === 'scheduled' || i.match.status === 'warmup');
	return next ? { item: next, live: false } : null;
}

/** Totals over every finished game here. Scores without stored goals come from goal rows. */
async function loadStats(playgroundId: number): Promise<PlaygroundStats | null> {
	const rows = await db
		.select({
			id: games.id,
			date: games.date,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId
		})
		.from(games)
		.where(playedHere(playgroundId));

	if (rows.length === 0) return null;

	const counts = await goalCountsByGame(
		rows.filter((r) => r.goalsHome == null || r.goalsAway == null).map((r) => r.id)
	);
	const scores = rows.map((row) => resolveScores(row, counts));
	const goals = scores.reduce((sum, s) => sum + s.homeScore + s.awayScore, 0);
	const firstGame = rows
		.map((r) => naiveToIso(r.date))
		.reduce((min, iso) => (iso < min ? iso : min));

	return {
		...resultCounts(scores),
		goals,
		goalsPerGame: goals / rows.length,
		firstGame
	};
}

async function loadClub(clubId: number | null): Promise<PlaygroundPageData['club']> {
	if (clubId == null) return null;
	const [club] = await db
		.select({ name: clubs.name, emblem: clubs.emblem, visible: clubs.visible })
		.from(clubs)
		.where(eq(clubs.id, clubId))
		.limit(1);
	// A hidden club's page is a 404, so don't link to it.
	if (!club || !club.visible) return null;
	return { name: club.name, emblem: emblemUrl(club.emblem), href: clubHref(club.name) };
}

export async function loadPlaygroundPage(
	playground: PlaygroundRow,
	user: AuthUser | null,
	now = new Date()
): Promise<PlaygroundPageData> {
	const signedIn = !!user;
	const firstPageSize = signedIn ? PLAYGROUND_GAMES_PAGE_SIZE : PLAYGROUND_GUEST_GAMES;

	const [club, upcoming, stats, firstPage, perms] = await Promise.all([
		loadClub(playground.clubId),
		loadUpcoming(playground.id, now),
		loadStats(playground.id),
		loadGames(playground.id, firstPageSize + 1, 0, now),
		user ? getUserPermissionNames(user.id) : Promise.resolve(new Set<string>())
	]);

	const total = stats?.total ?? 0;
	const shown = firstPage.slice(0, firstPageSize);
	const hasMore = firstPage.length > firstPageSize;

	const coords = parsePointLatLon(playground.location);
	const picture = playground.picture?.trim()
		? mediaUrl(playground.picture)!
		: placeholder16x9(playground.id);
	const surface = playground.surface?.trim() || null;

	return {
		id: playground.id,
		name: playground.name,
		picture,
		surface,
		dimensions:
			playground.height && playground.width
				? { length: playground.height, width: playground.width }
				: null,
		capacity: playground.capacity && playground.capacity > 0 ? playground.capacity : null,
		obs: playground.obs?.trim() || null,
		club,
		location: coords
			? { ...coords, mapUrl: osmEmbedUrl(coords), ...directionsLinks(coords) }
			: null,
		upcoming,
		stats,
		games: {
			items: shown,
			total,
			nextOffset: signedIn && hasMore ? firstPageSize : null,
			remainingCount: signedIn ? 0 : Math.max(total - shown.length, 0)
		},
		editHref: hasPermission(perms, 'playgrounds')
			? adminUrl(`/playgrounds/${playground.id}`)
			: null,
		seo: { title: playground.name, ogImage: picture }
	};
}
