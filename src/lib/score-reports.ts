/** Pure score-report helpers — ported from the legacy Laravel front controller. */

export const SCORE_REPORT_MAX_STEPPER = 31;
export const SCORE_REPORT_MAX_VALID = 32;
export const SCORE_REPORT_BAN_THRESHOLD = 20;
export const SCORE_REPORT_FINISHED_AFTER_MS = 105 * 60 * 1000;
export const SCORE_REPORT_NEAR_PLAYGROUND_M = 150;
export const SCORE_REPORT_LOCATION_ACCURACY_CAP = 1000;
export const SCORE_REPORT_UUID_COOKIE = 'uuid';
/** ~1 year in minutes — matches Laravel cookie lifespan for `uuid`. */
export const SCORE_REPORT_UUID_MAX_AGE = 525_948 * 60;
export const SCORE_REPORT_FLASH_COOKIE = 'score_report_flash';

export type ScoreReportBanRow = {
	id: number;
	userId: number | null;
	uuid: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	shadowBan: boolean;
	ipBan: boolean;
	reason: string | null;
	expiresAt: string | Date | null;
};

/** Ports Carbon `diffInMinutes > 105` for the finished toggle. */
export function canMarkFinished(kickoffIso: string, now = new Date()): boolean {
	const kickoff = new Date(kickoffIso).getTime();
	if (Number.isNaN(kickoff)) return false;
	return now.getTime() - kickoff > SCORE_REPORT_FINISHED_AFTER_MS;
}

export function clampScore(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(SCORE_REPORT_MAX_STEPPER, Math.max(0, Math.trunc(value)));
}

export type ScoreValidation =
	| { ok: true; homeScore: number; awayScore: number }
	| { ok: false; reason: 'invalid' | 'ridiculous' };

export function validateScores(homeScore: number, awayScore: number): ScoreValidation {
	if (
		!Number.isInteger(homeScore) ||
		!Number.isInteger(awayScore) ||
		homeScore < 0 ||
		awayScore < 0 ||
		homeScore > SCORE_REPORT_MAX_VALID ||
		awayScore > SCORE_REPORT_MAX_VALID
	) {
		return { ok: false, reason: 'invalid' };
	}
	if (homeScore > SCORE_REPORT_BAN_THRESHOLD || awayScore > SCORE_REPORT_BAN_THRESHOLD) {
		return { ok: false, reason: 'ridiculous' };
	}
	return { ok: true, homeScore, awayScore };
}

/**
 * Same-origin path for redirects. Accepts a path or an absolute URL on `origin`.
 * Drops open redirects the legacy FILTER_VALIDATE_URL allowed.
 */
export function safeReturnTo(
	raw: string | null | undefined,
	origin: string,
	fallback: string
): string {
	const value = (raw ?? '').trim();
	if (!value) return fallback;

	if (value.startsWith('/') && !value.startsWith('//')) {
		return value;
	}

	try {
		const url = new URL(value);
		const base = new URL(origin);
		if (url.origin === base.origin) {
			return `${url.pathname}${url.search}${url.hash}`;
		}
	} catch {
		/* ignore */
	}

	return fallback;
}

/** Ports ScoreReportBan::findMatch — first matching active ban wins. */
export function findMatchingBan(
	bans: ScoreReportBanRow[],
	input: {
		uuid: string;
		userId: number | null;
		ipAddress: string | null;
		userAgent: string | null;
	}
): ScoreReportBanRow | null {
	for (const ban of bans) {
		if (ban.userId != null && input.userId != null && ban.userId === input.userId) {
			return ban;
		}
		if (ban.uuid && ban.uuid === input.uuid) {
			return ban;
		}
		if (input.ipAddress && ban.ipAddress === input.ipAddress && ban.ipBan) {
			return ban;
		}
		if (
			input.ipAddress &&
			ban.ipAddress === input.ipAddress &&
			input.userAgent &&
			ban.userAgent === input.userAgent
		) {
			return ban;
		}
	}
	return null;
}

export type RateLimitInput = {
	recentByUser: boolean;
	recentByUuid: boolean;
	recentByIpCount: number;
};

export type RateLimitResult =
	| { ok: true }
	| { ok: false; reason: 'recent_user' | 'recent_uuid' | 'recent_ip' };

export function checkRateLimits(input: RateLimitInput): RateLimitResult {
	if (input.recentByUser) return { ok: false, reason: 'recent_user' };
	if (input.recentByUuid) return { ok: false, reason: 'recent_uuid' };
	if (input.recentByIpCount >= 3) return { ok: false, reason: 'recent_ip' };
	return { ok: true };
}

/** Haversine distance in metres (ports ScoreReport::haversineGreatCircleDistance). */
export function haversineMetres(
	latFrom: number,
	lonFrom: number,
	latTo: number,
	lonTo: number,
	earthRadius = 6_371_000
): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const φ1 = toRad(latFrom);
	const φ2 = toRad(latTo);
	const Δφ = toRad(latTo - latFrom);
	const Δλ = toRad(lonTo - lonFrom);

	const a =
		Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
	return 2 * Math.asin(Math.sqrt(a)) * earthRadius;
}

export function isNearPlayground(
	report: { lat: number; lon: number },
	playground: { lat: number; lon: number },
	maxMetres = SCORE_REPORT_NEAR_PLAYGROUND_M
): boolean {
	const distance = haversineMetres(report.lat, report.lon, playground.lat, playground.lon);
	return distance >= 0 && distance <= maxMetres;
}

/** Latitude/longitude are real numbers; 0 is a valid coordinate (unlike PHP empty()). */
export function parseOptionalCoord(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return null;
	return n;
}

export function clampLocationAccuracy(value: number | null): number | null {
	if (value == null || !Number.isFinite(value)) return null;
	return Math.min(value, SCORE_REPORT_LOCATION_ACCURACY_CAP);
}

export function ridiculousBanReason(homeClubName: string, awayClubName: string): string {
	return `Envio de resultados falsos no jogo ${homeClubName} vs ${awayClubName}`;
}

export function isValidUuidCookie(value: string | undefined | null): value is string {
	if (!value) return false;
	return value.length > 0 && value.length <= 36;
}
