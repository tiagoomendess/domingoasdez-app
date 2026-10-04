/**
 * Legacy Laravel `config/app.php` timezone is `UTC`. Naive DATETIME/TIMESTAMP
 * values from MySQL are therefore UTC wall-clock values.
 *
 * mysql2 may return strings (`dateStrings: true`) or Date objects depending on
 * the driver/Drizzle path — handle both.
 */

const UTC = 'UTC';

const MYSQL_DATETIME =
	/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

/** Convert a naive MySQL datetime / Date to an ISO-8601 UTC string. */
export function naiveToIso(naive: string | Date): string {
	if (naive instanceof Date) {
		if (Number.isNaN(naive.getTime())) {
			throw new RangeError(`Invalid Date value`);
		}
		return naive.toISOString();
	}

	const raw = String(naive).trim();
	if (!raw || raw.startsWith('0000-00-00')) {
		throw new RangeError(`Invalid MySQL datetime: ${JSON.stringify(naive)}`);
	}

	// Already has a zone marker (ISO from a previous conversion, or similar)
	if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
		const parsed = new Date(raw);
		if (Number.isNaN(parsed.getTime())) {
			throw new RangeError(`Invalid datetime: ${JSON.stringify(naive)}`);
		}
		return parsed.toISOString();
	}

	const match = MYSQL_DATETIME.exec(raw);
	if (match) {
		const [, y, mo, d, h, mi, s = '00'] = match;
		const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
		const parsed = new Date(iso);
		if (Number.isNaN(parsed.getTime())) {
			throw new RangeError(`Invalid MySQL datetime: ${JSON.stringify(naive)}`);
		}
		return parsed.toISOString();
	}

	throw new RangeError(`Unrecognized datetime: ${JSON.stringify(naive)}`);
}

/** Current instant as a naive UTC `YYYY-MM-DD HH:mm:ss` string (for SQL comparisons). */
export function nowNaiveUtc(now = new Date()): string {
	return now.toISOString().slice(0, 19).replace('T', ' ');
}

/** Current instant as ISO-8601. */
export function nowIso(now = new Date()): string {
	return now.toISOString();
}

export { UTC as LEGACY_TIMEZONE };
