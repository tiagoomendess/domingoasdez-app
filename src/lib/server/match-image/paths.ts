/**
 * File paths and names for the game images (pure, so they can be unit tested apart from the
 * loader in index.ts).
 */
import { slugify } from '#lib/slug.ts';
import type { MatchImageFormat } from './render.ts';

/** Legacy `Media::getPlaceholder()`: one of ten stock pictures, by the id's last digit. */
export function placeholderPath(ratio: '16_9' | '1_1', id: number): string {
	return `/images/${ratio}_placeholder_${String(id).slice(-1)}.jpg`;
}

/**
 * The background the legacy service picked: the playground's picture, else a placeholder by the
 * playground id (square: the 1:1 one, via `str_replace('16_9_placeholder_', '1_1_placeholder_')`),
 * or by the game id when the game has no playground.
 */
export function backgroundPath(
	format: MatchImageFormat,
	game: { id: number },
	playground: { id: number; picture: string | null } | null
): string {
	const ratio = format === 'square' ? '1_1' : '16_9';
	if (!playground) return placeholderPath(ratio, game.id);
	return playground.picture || placeholderPath(ratio, playground.id);
}

/** `-vs-` file name of the download (legacy `Str::slug(home-vs-away) . '-square.jpg'`). */
export function matchImageFileName(homeClub: string, awayClub: string, format: MatchImageFormat) {
	return `${slugify(`${homeClub}-vs-${awayClub}`)}-${format}.jpg`;
}
