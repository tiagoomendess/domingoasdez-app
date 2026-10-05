/**
 * Pure game helpers shared by the server module and client (status, URLs, Lisbon days).
 */
import type { MatchStatus } from '#lib/components/types.ts';
import { seasonNameSlug } from '#lib/competitions.ts';
import { addDays } from '#lib/format.ts';
import { slugify } from '#lib/slug.ts';

const GAME_TZ = 'Europe/Lisbon';
const WARMUP_MS = 30 * 60 * 1000;
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(day: string): boolean {
	if (!DAY_RE.test(day)) return false;
	const [y, m, d] = day.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

type ZonedParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

function zonedParts(instant: Date, timeZone: string): ZonedParts {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(instant);

	const get = (type: Intl.DateTimeFormatPartTypes) => {
		const value = parts.find((p) => p.type === type)?.value;
		if (!value) throw new RangeError(`Missing ${type} in zoned parts`);
		return Number(value);
	};

	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute'),
		second: get('second')
	};
}

/** How far ahead `timeZone` wall-clock is relative to the given UTC instant. */
function timeZoneOffsetMs(timeZone: string, instant: Date): number {
	const z = zonedParts(instant, timeZone);
	const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
	return asUtc - instant.getTime();
}

function lisbonMidnightUtcMs(day: string): number {
	const [y, m, d] = day.split('-').map(Number);
	let utc = Date.UTC(y, m - 1, d, 0, 0, 0);
	// Offset depends on the instant (DST); converge in a couple of iterations.
	for (let i = 0; i < 3; i++) {
		const offset = timeZoneOffsetMs(GAME_TZ, new Date(utc));
		utc = Date.UTC(y, m - 1, d, 0, 0, 0) - offset;
	}
	return utc;
}

function toNaiveUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Half-open Lisbon calendar day `[start, end)` as naive UTC MySQL datetimes.
 * Handles DST transitions (short/long days).
 */
export function lisbonDayRangeUtc(day: string): {
	startNaive: string;
	endNaive: string;
	startMs: number;
	endMs: number;
} {
	if (!isValidDay(day)) throw new RangeError(`Invalid day: ${day}`);
	const startMs = lisbonMidnightUtcMs(day);
	const endMs = lisbonMidnightUtcMs(addDays(day, 1));
	return {
		startNaive: toNaiveUtc(startMs),
		endNaive: toNaiveUtc(endMs),
		startMs,
		endMs
	};
}

/** `YYYY-MM-DD` of an instant in Europe/Lisbon. */
export function lisbonDayOf(isoOrDate: string | Date): string {
	const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
	if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date: ${isoOrDate}`);
	return new Intl.DateTimeFormat('en-CA', { timeZone: GAME_TZ }).format(date);
}

export type GameStatusInput = {
	kickoffIso: string;
	finished: boolean;
	postponed: boolean;
};

/**
 * Resolve match status for the games list.
 * Live window matches legacy: warm-up from −30 min, live until +3 h.
 * Finished games are never "live" (unlike legacy /direto).
 */
export function gameStatus(input: GameStatusInput, now = new Date()): MatchStatus {
	if (input.postponed) return 'postponed';
	if (input.finished) return 'finished';

	const kickoff = new Date(input.kickoffIso).getTime();
	if (Number.isNaN(kickoff)) return 'scheduled';

	const t = now.getTime();
	const warmupStart = kickoff - WARMUP_MS;
	const liveEnd = kickoff + LIVE_WINDOW_MS;

	if (t >= warmupStart && t < kickoff) return 'warmup';
	if (t >= kickoff && t < liveEnd) return 'live';
	return 'scheduled';
}

export function isLiveStatus(status: MatchStatus): boolean {
	return status === 'warmup' || status === 'live';
}

const MVP_OPEN_AFTER_MS = 65 * 60 * 1000;
const MVP_CLOSE_AFTER_MS = 240 * 60 * 1000;
/** Legacy `allowScoreReports` mutates Carbon twice with addHours(3) → 6h window. */
const SCORE_REPORT_WINDOW_MS = 6 * 60 * 60 * 1000;

/** True when kickoff has passed (ports Game::started). */
export function hasStarted(kickoffIso: string, now = new Date()): boolean {
	const kickoff = new Date(kickoffIso).getTime();
	if (Number.isNaN(kickoff)) return false;
	return now.getTime() > kickoff;
}

/** Ports Game::isMvpVoteOpen — open from kickoff+65min to kickoff+240min. */
export function isMvpVoteOpen(kickoffIso: string, now = new Date()): boolean {
	const kickoff = new Date(kickoffIso).getTime();
	if (Number.isNaN(kickoff)) return false;
	const t = now.getTime();
	return t > kickoff + MVP_OPEN_AFTER_MS && t < kickoff + MVP_CLOSE_AFTER_MS;
}

/** Ports Game::allowScoreReports — started and within 6h of kickoff. */
export function allowScoreReports(kickoffIso: string, now = new Date()): boolean {
	if (!hasStarted(kickoffIso, now)) return false;
	const kickoff = new Date(kickoffIso).getTime();
	return now.getTime() < kickoff + SCORE_REPORT_WINDOW_MS;
}

export type FormResult = 'V' | 'E' | 'D';

export type FormGameInput = {
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number;
	awayScore: number;
};

/** Win / draw / loss for `teamId` in a finished game (ports V/E/D chips; no pens). */
export function formResult(game: FormGameInput, teamId: number): FormResult {
	if (game.homeScore === game.awayScore) return 'E';
	const homeWon = game.homeScore > game.awayScore;
	const teamIsHome = game.homeTeamId === teamId;
	if (homeWon === teamIsHome) return 'V';
	return 'D';
}

export type HeadToHeadPastGame = {
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number;
	awayScore: number;
};

export type HeadToHeadStats = {
	homeWins: number;
	draws: number;
	awayWins: number;
	total: number;
	homeWinPercent: number;
	drawPercent: number;
	awayWinPercent: number;
};

/**
 * Aggregate past H2H results from the *current* home team's perspective
 * (ports GamesController past_result_stats; draws ignore penalties).
 */
export function headToHeadStats(
	pastGames: HeadToHeadPastGame[],
	homeTeamId: number
): HeadToHeadStats {
	let homeWins = 0;
	let draws = 0;
	let awayWins = 0;

	for (const game of pastGames) {
		if (game.homeScore === game.awayScore) {
			draws++;
			continue;
		}
		const pastHomeWon = game.homeScore > game.awayScore;
		const winnerTeamId = pastHomeWon ? game.homeTeamId : game.awayTeamId;
		if (winnerTeamId === homeTeamId) homeWins++;
		else awayWins++;
	}

	const total = pastGames.length;
	return {
		homeWins,
		draws,
		awayWins,
		total,
		homeWinPercent: total > 0 ? (homeWins / total) * 100 : 0,
		drawPercent: total > 0 ? (draws / total) * 100 : 0,
		awayWinPercent: total > 0 ? (awayWins / total) * 100 : 0
	};
}

export function competitionHref(params: {
	startYear: number;
	endYear: number;
	displayName: string;
}): string {
	return `/competicoes/${seasonNameSlug(params.startYear, params.endYear)}/${slugify(params.displayName)}`;
}

export function gameHref(params: {
	startYear: number;
	endYear: number;
	displayName: string;
	groupName: string;
	round: number;
	homeClubName: string;
	awayClubName: string;
}): string {
	const clubsSlug = `${slugify(params.homeClubName)}-vs-${slugify(params.awayClubName)}`;
	return `${competitionHref(params)}/${slugify(params.groupName)}/${params.round}/${clubsSlug}`;
}

/** Build a contiguous `YYYY-MM-DD` range, inclusive, oldest first. */
export function dayRange(center: string, before: number, after: number): string[] {
	const days: string[] = [];
	for (let i = -before; i <= after; i++) days.push(addDays(center, i));
	return days;
}

/**
 * True when `next` is `prev` with days added only at the ends.
 * A window rebuilt around another selected day is not an extension.
 */
export function isDayListExtension(prev: readonly string[], next: readonly string[]): boolean {
	if (prev.length === 0 || next.length < prev.length) return false;
	const start = next.indexOf(prev[0]);
	if (start < 0 || start + prev.length > next.length) return false;
	for (let i = 0; i < prev.length; i++) {
		if (next[start + i] !== prev[i]) return false;
	}
	return true;
}
