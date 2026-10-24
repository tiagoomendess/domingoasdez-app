/**
 * Pure helpers for grounds ("campos", the `playgrounds` table): map and directions links,
 * the home record, and the season breaks in a list of games played there.
 */
import type { Match } from '#lib/components/types.ts';

export type LatLon = { lat: number; lon: number };

/** One game in a ground's list: the row, plus what its caption and season header show. */
export type PlaygroundGameItem = {
	match: Match;
	/** `2025/26`, for the season sub-header. */
	season: string;
	/** Competition display name, for the row caption. */
	competition: string;
	round: number;
};

export type PlaygroundGamesPage = { items: PlaygroundGameItem[]; nextOffset: number | null };

export type ResultCounts = {
	homeWins: number;
	draws: number;
	awayWins: number;
	total: number;
	homeWinPercent: number;
	drawPercent: number;
	awayWinPercent: number;
};

export type PlaygroundStats = ResultCounts & {
	goals: number;
	goalsPerGame: number;
	/** Kick-off of the first finished game on record (ISO). */
	firstGame: string;
};

export function directionsLinks({ lat, lon }: LatLon) {
	return {
		googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
		wazeUrl: `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`
	};
}

/** OpenStreetMap's embeddable map around the point, with a marker on it. */
export function osmEmbedUrl({ lat, lon }: LatLon, span = 0.004): string {
	const dLon = span * 1.5;
	const bbox = [lon - dLon, lat - span, lon + dLon, lat + span].map((n) => n.toFixed(6)).join(',');
	return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

/** Home wins, draws and away wins over finished games (by side, not by team). */
export function resultCounts(scores: { homeScore: number; awayScore: number }[]): ResultCounts {
	let homeWins = 0;
	let draws = 0;
	let awayWins = 0;

	for (const { homeScore, awayScore } of scores) {
		if (homeScore > awayScore) homeWins++;
		else if (homeScore < awayScore) awayWins++;
		else draws++;
	}

	const total = scores.length;
	const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
	return {
		homeWins,
		draws,
		awayWins,
		total,
		homeWinPercent: pct(homeWins),
		drawPercent: pct(draws),
		awayWinPercent: pct(awayWins)
	};
}

/**
 * Indexes of the items that start a new season, so the list can put a header above them.
 * Run it over the whole list shown (first page plus the pages "Ver mais" appended), so a season
 * that carries over into the next page doesn't get its header twice.
 */
export function seasonBreaks(items: Pick<PlaygroundGameItem, 'season'>[]): Set<number> {
	const breaks = new Set<number>();
	let current: string | null = null;
	items.forEach((item, i) => {
		if (item.season !== current) {
			breaks.add(i);
			current = item.season;
		}
	});
	return breaks;
}
