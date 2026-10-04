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
