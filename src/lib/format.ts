import { getLocale } from '#lib/messages.ts';

// Game times always follow Portuguese time, whatever the device's time zone (legacy behaviour).
const GAME_TIME_ZONE = 'Europe/Lisbon';

export function todayInLisbon() {
	return new Intl.DateTimeFormat('en-CA', { timeZone: GAME_TIME_ZONE }).format(new Date());
}

function yearInLisbon(date: Date) {
	return Number(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: GAME_TIME_ZONE,
			year: 'numeric'
		}).format(date)
	);
}

export function formatKickoff(iso: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: GAME_TIME_ZONE
	}).format(new Date(iso));
}

/** Short day + month from a kickoff ISO, in Europe/Lisbon. Includes the year when it differs from now. */
export function formatKickoffDay(iso: string, now = new Date()) {
	const date = new Date(iso);
	const options: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'short',
		timeZone: GAME_TIME_ZONE
	};
	if (yearInLisbon(date) !== yearInLisbon(now)) options.year = 'numeric';
	return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export function formatShortDate(iso: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: GAME_TIME_ZONE
	}).format(new Date(iso));
}

export function formatArticleDate(iso: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: GAME_TIME_ZONE
	}).format(new Date(iso));
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 31_536_000],
	['month', 2_592_000],
	['week', 604_800],
	['day', 86_400],
	['hour', 3_600],
	['minute', 60]
];

export function formatRelative(iso: string, now = Date.now()) {
	const seconds = (new Date(iso).getTime() - now) / 1000;
	const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });

	for (const [unit, size] of RELATIVE_UNITS) {
		if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
	}
	return format.format(0, 'minute');
}

/** `YYYY-MM-DD` calendar day, parsed as UTC so it never shifts a day across time zones. */
export function parseDay(day: string) {
	const [year, month, date] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, date));
}

/** Three letters in every locale: pt-PT's "short" weekday is the full word ("quinta") */
export function formatWeekday(day: string) {
	const weekday = new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' })
		.format(parseDay(day))
		.replace('.', '')
		.slice(0, 3);
	return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function formatDayOfMonth(day: string) {
	return parseDay(day).getUTCDate();
}

export function addDays(day: string, amount: number) {
	const date = parseDay(day);
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
}

/** Short day + month for CTAs like "Próximo jogo: 12 out". */
export function formatDayMonth(day: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	}).format(parseDay(day));
}

/** Calendar day in Europe/Lisbon as d/m/Y (legacy game-date format). */
export function formatLisbonDay(iso: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		timeZone: GAME_TIME_ZONE
	}).format(new Date(iso));
}

/** Clock time in Europe/Lisbon as HH:mm (legacy deadline format). */
export function formatLisbonTime(iso: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: GAME_TIME_ZONE
	}).format(new Date(iso));
}

/** Short month + year for transfer history (e.g. "out 2024"), Europe/Lisbon. */
export function formatMonthYear(iso: string) {
	return new Intl.DateTimeFormat(getLocale(), {
		month: 'short',
		year: 'numeric',
		timeZone: GAME_TIME_ZONE
	}).format(new Date(iso));
}
