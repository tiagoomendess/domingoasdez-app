/**
 * Season year label helpers shared by competitions UI and detail routes.
 * Slug parsing matches legacy Season::parseNameSlug / getNameSlug.
 */

/** Human label: `Época 2025/26` or `Época 2026` when start === end. */
export function formatSeasonLabel(startYear: number, endYear: number): string {
	if (startYear === endYear) return `Época ${startYear}`;
	return `Época ${startYear}/${String(endYear).slice(-2)}`;
}

/** Short season label: `2025/26` or `2026` (matches legacy formatSeasonLabel / getName). */
export function formatSeasonShort(startYear: number, endYear: number): string {
	if (startYear === endYear) return String(startYear);
	return `${startYear}/${String(endYear).slice(-2)}`;
}

/** URL season slug: `2025-26` or `2026` (matches legacy Season::getNameSlug). */
export function seasonNameSlug(startYear: number, endYear: number): string {
	if (startYear === endYear) return String(startYear);
	return `${startYear}-${String(endYear).slice(-2)}`;
}

/**
 * Parse a season URL slug into [startYear, endYear].
 * Accepts: 2025, 2025-26, 2025-2026 (and century wrap e.g. 1999-00 → 1999, 2000).
 */
export function parseSeasonSlug(slug: string): [number, number] | null {
	if (/^(\d{4})$/.test(slug)) {
		const year = Number(slug);
		return [year, year];
	}

	const full = /^(\d{4})-(\d{4})$/.exec(slug);
	if (full) {
		return [Number(full[1]), Number(full[2])];
	}

	const short = /^(\d{4})-(\d{2})$/.exec(slug);
	if (short) {
		const start = Number(short[1]);
		const endTwo = Number(short[2]);
		const startTwo = start % 100;
		const end =
			endTwo < startTwo
				? Math.floor(start / 100) * 100 + 100 + endTwo
				: Math.floor(start / 100) * 100 + endTwo;
		return [start, end];
	}

	return null;
}

/** Whether $slug is a legacy full-year form (2024-2025) that should redirect. */
export function isLegacyFullYearSlug(slug: string): boolean {
	return /^\d{4}-\d{4}$/.test(slug);
}

export type RoundGroup = { id: number; nameSlug: string; rounds: number[] };

/** Query param for the selected rounds on the competition page (repeated, one per group). */
export const ROUNDS_PARAM = 'jornada';

/**
 * Reads `?jornada=` values: a bare round (`5`) when the season has one group, otherwise
 * `{group slug}.{round}` (`serie-a.5`). Unknown groups and rounds are ignored.
 */
export function parseRoundParams(values: string[], groups: RoundGroup[]): Record<number, number> {
	const selected: Record<number, number> = {};
	for (const value of values) {
		const match = /^(?:(.+)\.)?(\d+)$/.exec(value.trim());
		if (!match) continue;
		const [, slug, round] = match;
		const group =
			slug == null
				? groups.length === 1
					? groups[0]
					: undefined
				: groups.find((g) => g.nameSlug === slug);
		if (group && !(group.id in selected) && group.rounds.includes(Number(round))) {
			selected[group.id] = Number(round);
		}
	}
	return selected;
}

/** The `?jornada=` values for the rounds moved away from each group's default, in group order. */
export function roundParams(
	selected: Record<number, number>,
	defaults: Record<number, number>,
	groups: RoundGroup[]
): string[] {
	const values: string[] = [];
	for (const group of groups) {
		const round = selected[group.id];
		if (round == null || round === defaults[group.id]) continue;
		values.push(groups.length === 1 ? String(round) : `${group.nameSlug}.${round}`);
	}
	return values;
}
