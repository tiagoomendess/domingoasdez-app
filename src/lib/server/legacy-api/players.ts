/**
 * Ports Api\PlayersController@index (`GET /api/players`): visible players by id, paginated
 * like Laravel's `paginate()`.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { clubs, players, teams } from '#lib/server/db/schema.ts';
import { playerAge } from '#lib/players.ts';
import { isNumeric } from './php.ts';

const DEFAULT_PER_PAGE = 15;
const MAX_PER_PAGE = 100;

/** `filter_var($v, FILTER_VALIDATE_INT)` as a number, or null. */
function validInt(value: unknown): number | null {
	if (typeof value === 'number') return Number.isInteger(value) ? value : null;
	if (typeof value !== 'string' || !/^[+-]?(0|[1-9]\d*)$/.test(value.trim())) return null;
	return Number(value.trim());
}

/**
 * `per_page`: legacy `min($perPage, 100)`. PHP's `min` returns the query value itself when it
 * wins, so the response echoes it as sent (`"20"`), and the number 100 or 15 otherwise.
 * Values that aren't a positive integer use 15 (legacy misbehaved on them).
 */
export function resolvePerPage(value: unknown): { perPage: number; echo: number | string } {
	const n = isNumeric(value) ? validInt(value) : null;
	if (n == null || n < 1) return { perPage: DEFAULT_PER_PAGE, echo: DEFAULT_PER_PAGE };
	if (n > MAX_PER_PAGE) return { perPage: MAX_PER_PAGE, echo: MAX_PER_PAGE };
	return { perPage: n, echo: value as number | string };
}

/** Laravel's `Paginator::resolveCurrentPage()`: a valid integer ≥ 1, else 1. */
export function resolvePage(value: unknown): number {
	const n = validInt(value);
	return n != null && n >= 1 ? n : 1;
}

/** A naive UTC `Y-m-d H:i:s` value as an instant (for age), or null. */
function naiveToDate(naive: string | null): Date | null {
	if (!naive) return null;
	const d = new Date(`${naive.replace(' ', 'T')}Z`);
	return Number.isNaN(d.getTime()) ? null : d;
}

export async function listPlayers(query: Record<string, unknown>, now = new Date()) {
	const { perPage, echo: perPageEcho } = resolvePerPage(query.per_page);
	const page = resolvePage(query.page);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)`.mapWith(Number) })
		.from(players)
		.where(eq(players.visible, true));

	const rows = await db
		.select({
			id: players.id,
			name: players.name,
			picture: players.picture,
			nickname: players.nickname,
			// Raw driver value: the naive `Y-m-d H:i:s` string, as Laravel printed it.
			birthDate: sql<string | null>`CAST(${players.birthDate} AS CHAR)`,
			clubName: clubs.name,
			associationId: players.associationId
		})
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(players.visible, true))
		.orderBy(asc(players.id))
		.limit(perPage)
		.offset((page - 1) * perPage);

	const data = rows.map((row) => ({
		id: row.id,
		name: row.name,
		picture: row.picture,
		nickname: row.nickname,
		birth_date: row.birthDate,
		age: row.birthDate ? playerAge(naiveToDate(row.birthDate), now) : null,
		current_club_name: row.clubName ?? null,
		association_id: row.associationId
	}));

	const from = data.length ? (page - 1) * perPage + 1 : null;

	return {
		success: true,
		data,
		pagination: {
			current_page: page,
			last_page: Math.max(Math.ceil(total / perPage), 1),
			per_page: perPageEcho,
			total,
			from,
			to: from == null ? null : from + data.length - 1
		}
	};
}
