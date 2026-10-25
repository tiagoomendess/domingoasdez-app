/**
 * Ports Front\MatchImageGeneratorController@generateImage: the square or story image of a game
 * that a signed-in user downloads from the game page, plus its audit row.
 *
 * Images come from the same places as on the legacy site: the playground's picture (or a stock
 * placeholder picked by the id's last digit), the club emblems (or the default emblem), and the
 * season's or competition's logo. `/images/...` files are this app's static copies of the legacy
 * ones; uploads go through `mediaUrl()`.
 */
import { read } from '$app/server';
import type { RequestEvent } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { addAudit, phpPrettyJson } from '#lib/server/audit.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	playgrounds,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import { goalCountsByGame, resolveScores } from '#lib/server/games.ts';
import { legacyDisplayName, legacyDisplayPicture } from '#lib/server/legacy-api/competitions.ts';
import { legacyEmblem } from '#lib/server/legacy-api/games.ts';
import { isDraw } from '#lib/server/legacy-api/live.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { registerFonts } from './draw.ts';
import blackFontUrl from './fonts/Roboto-Black.ttf';
import regularFontUrl from './fonts/Roboto-Regular.ttf';
import { backgroundPath, matchImageFileName, placeholderPath } from './paths.ts';
import { matchDateLine, renderMatchImage, type MatchImageFormat } from './render.ts';

export type { MatchImageFormat };

const DEFAULT_EMBLEM = '/images/default-emblem.png';
const FETCH_TIMEOUT_MS = 15_000;

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

async function loadGame(gameId: number) {
	const [row] = await db
		.select({
			id: games.id,
			date: games.date,
			visible: games.visible,
			finished: games.finished,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			homeClubName: homeClub.name,
			homeClubEmblem: homeClub.emblem,
			awayClubName: awayClub.name,
			awayClubEmblem: awayClub.emblem,
			seasonName: seasons.name,
			seasonPicture: seasons.picture,
			competitionName: competitions.name,
			competitionPicture: competitions.picture,
			playgroundId: playgrounds.id,
			playgroundName: playgrounds.name,
			playgroundPicture: playgrounds.picture
		})
		.from(games)
		.innerJoin(gameGroups, eq(gameGroups.id, games.gameGroupId))
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.innerJoin(homeTeam, eq(homeTeam.id, games.homeTeamId))
		.innerJoin(homeClub, eq(homeClub.id, homeTeam.clubId))
		.innerJoin(awayTeam, eq(awayTeam.id, games.awayTeamId))
		.innerJoin(awayClub, eq(awayClub.id, awayTeam.clubId))
		.leftJoin(playgrounds, eq(playgrounds.id, games.playgroundId))
		.where(eq(games.id, gameId))
		.limit(1);
	return row ?? null;
}

/** The game's columns as Eloquent's `toArray()` gave them (raw values), for the audit row. */
async function rawGameRow(gameId: number): Promise<Record<string, unknown> | null> {
	const [result] = await db.execute(sql`SELECT * FROM ${games} WHERE ${games.id} = ${gameId}`);
	return (result as unknown as Record<string, unknown>[])[0] ?? null;
}

async function loadBytes(event: RequestEvent, path: string): Promise<Uint8Array> {
	// Static copies of the legacy /images/ files: SvelteKit's fetch reads them from disk.
	const url = path.startsWith('/images/') ? path : mediaUrl(path);
	if (!url) throw new Error(`No image at "${path}"`);
	const response = path.startsWith('/images/')
		? await event.fetch(url)
		: await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	if (!response.ok) throw new Error(`Image ${url}: HTTP ${response.status}`);
	return new Uint8Array(await response.arrayBuffer());
}

/**
 * Loads `path`, or `fallback` when it can't be read. Legacy failed the whole request (500) on a
 * missing emblem or competition logo; the image is still worth having with a stand-in.
 */
async function loadOr(event: RequestEvent, path: string | null, fallback: string | null) {
	if (path) {
		try {
			return await loadBytes(event, path);
		} catch (e) {
			console.error('[match-image] Could not load', path, e);
		}
	}
	return fallback ? loadBytes(event, fallback) : null;
}

async function ensureFonts() {
	const [regular, black] = await Promise.all([
		read(regularFontUrl).arrayBuffer(),
		read(blackFontUrl).arrayBuffer()
	]);
	registerFonts({ regular: new Uint8Array(regular), black: new Uint8Array(black) });
}

/** Null for an unknown or hidden game. */
export async function generateMatchImage(
	event: RequestEvent,
	gameId: number,
	format: MatchImageFormat,
	userId: number
): Promise<{ bytes: Uint8Array; fileName: string } | null> {
	const game = await loadGame(gameId);
	if (!game || !game.visible) return null;

	const playground =
		game.playgroundId != null
			? { id: game.playgroundId, picture: game.playgroundPicture || null }
			: null;
	const background = backgroundPath(format, game, playground);
	const backgroundFallback =
		format === 'square' ? placeholderPath('1_1', game.id) : placeholderPath('16_9', game.id);

	const [backgroundBytes, watermark, homeEmblem, awayEmblem, competitionLogo, counts] =
		await Promise.all([
			loadOr(event, background, backgroundFallback),
			loadBytes(
				event,
				format === 'square' ? '/images/watermark.png' : '/images/story_watermark.png'
			),
			loadOr(event, legacyEmblem(game.homeClubEmblem), DEFAULT_EMBLEM),
			loadOr(event, legacyEmblem(game.awayClubEmblem), DEFAULT_EMBLEM),
			loadOr(event, legacyDisplayPicture(game.seasonPicture, game.competitionPicture), null),
			goalCountsByGame([game.id]),
			ensureFonts()
		]);

	const { homeScore, awayScore } = resolveScores(game, counts);
	const decidedByPenalties =
		isDraw(game, counts) && game.penaltiesHome != null && game.penaltiesAway != null;

	const bytes = await renderMatchImage({
		format,
		background: backgroundBytes!,
		watermark,
		homeEmblem: homeEmblem!,
		awayEmblem: awayEmblem!,
		competitionLogo,
		competition: legacyDisplayName(game.seasonName, game.competitionName),
		homeClub: game.homeClubName,
		awayClub: game.awayClubName,
		playground: game.playgroundName ?? '',
		dateLine: matchDateLine(new Date(game.date)),
		result: game.finished
			? {
					home: homeScore,
					away: awayScore,
					penalties: decidedByPenalties
						? { home: game.penaltiesHome!, away: game.penaltiesAway! }
						: null
				}
			: null
	});

	const formatLabel = format === 'square' ? 'quadrada' : 'story';
	await addAudit(event, {
		action: 'view',
		model: format === 'square' ? 'MatchImageSquare' : 'MatchImageStory',
		modelId: game.id,
		userId,
		oldValues: 'null',
		newValues: phpPrettyJson((await rawGameRow(game.id)) ?? {}),
		extraInfo: game.finished
			? `Imagem ${formatLabel} de resultado final`
			: `Imagem ${formatLabel} de divulgação ao jogo`
	});

	return { bytes, fileName: matchImageFileName(game.homeClubName, game.awayClubName, format) };
}
