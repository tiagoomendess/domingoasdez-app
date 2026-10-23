/**
 * Ports Api\PlayerUpdateRequestsController (`POST /api/player-update-requests` and
 * `GET /api/player-update-requests/{id}`): requests to create or update a player, sent by the
 * player scraper and reviewed in the admin.
 */
import { and, eq, gt, isNull, sql, type SQL } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import { nowNaiveUtc } from '#lib/server/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { playerUpdateRequests, players } from '#lib/server/db/schema.ts';
import { legacyJson } from './http.ts';
import { phpJsonEncode, phpString } from './php.ts';
import { parseLegacyDate, validate, type Rules } from './validate.ts';

const POSITIONS = 'in:none,striker,midfielder,defender,goalkeeper';

const SHARED_RULES: Rules = {
	association_id: ['nullable', 'string', 'max:155'],
	phone: ['nullable', 'string', 'max:14', 'min:6'],
	email: ['nullable', 'string', 'max:100', 'min:3', 'email'],
	facebook_profile: ['nullable', 'string', 'max:280', 'url'],
	birth_date: ['nullable', 'date'],
	position: ['nullable', 'string', POSITIONS],
	obs: ['nullable', 'string', 'max:3000', 'min:6'],
	team: ['nullable', 'string', 'max:155'],
	created_by: ['nullable', 'string', 'max:100'],
	source_data: ['nullable', 'array']
};

export const CREATE_RULES: Rules = {
	player_id: ['nullable'],
	name: ['required', 'string', 'max:155', 'min:3'],
	picture_url: ['required', 'string', 'max:280', 'url'],
	club_name: ['required', 'string', 'max:155', 'min:3'],
	nickname: ['nullable', 'string', 'max:155', 'min:2'],
	...SHARED_RULES
};

export const UPDATE_RULES: Rules = {
	player_id: ['required', 'integer', 'exists:players,id'],
	name: ['nullable', 'string', 'max:155', 'min:3'],
	nickname: ['nullable', 'string', 'max:155', 'min:2'],
	club_name: ['nullable', 'string', 'max:155', 'min:3'],
	picture_url: ['nullable', 'string', 'max:280', 'url'],
	...SHARED_RULES
};

/** Carbon 2's `toISOString()` for a naive UTC `Y-m-d H:i:s` value. */
export function carbonIso(naive: string | null): string | null {
	if (!naive || naive.startsWith('0000-00-00')) return null;
	return `${naive.slice(0, 10)}T${naive.slice(11, 19)}.000000Z`;
}

function carbonIsoFromDate(date: Date): string {
	return date.toISOString().replace(/\.(\d{3})Z$/, (_, ms: string) => `.${ms}000Z`);
}

/** `$request->key`: the value, or null when missing. */
function get(all: Record<string, unknown>, key: string): unknown {
	return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : null;
}

function str(value: unknown): string | null {
	return value == null ? null : phpString(value);
}

/** Eloquent `where($column, $value)`: `IS NULL` for null. */
function sameAs(column: MySqlColumn, value: unknown): SQL {
	return value == null ? isNull(column) : sql`${column} = ${phpString(value)}`;
}

export async function storePlayerUpdateRequest(all: Record<string, unknown>, now = new Date()) {
	const isCreate = get(all, 'player_id') === null;

	const errors = await validate(all, isCreate ? CREATE_RULES : UPDATE_RULES);
	if (errors) {
		return legacyJson({ success: false, message: 'Validation failed', errors }, 400);
	}

	const playerId = get(all, 'player_id');
	const tenDaysAgo = nowNaiveUtc(new Date(now.getTime() - 10 * 24 * 60 * 60_000));
	const [duplicate] = await db
		.select({ id: playerUpdateRequests.id })
		.from(playerUpdateRequests)
		.where(
			and(
				sameAs(playerUpdateRequests.playerId, playerId),
				gt(playerUpdateRequests.createdAt, sql`${tenDaysAgo}`),
				sameAs(playerUpdateRequests.name, get(all, 'name')),
				sameAs(playerUpdateRequests.nickname, get(all, 'nickname')),
				sameAs(playerUpdateRequests.clubName, get(all, 'club_name')),
				sameAs(playerUpdateRequests.team, get(all, 'team'))
			)
		)
		.limit(1);

	if (duplicate) {
		return legacyJson({ success: false, message: 'Recent duplicate request, did not add another' });
	}

	if (!isCreate) {
		const [player] = await db
			.select({ id: players.id })
			.from(players)
			.where(sql`${players.id} = ${phpString(playerId)}`)
			.limit(1);
		if (!player) return legacyJson({ success: false, message: 'Player not found' }, 404);
	}

	const createdBy = str(get(all, 'created_by'));
	const sourceData = get(all, 'source_data');
	const birthDate = get(all, 'birth_date');
	const position = str(
		get(all, 'position')
	) as (typeof playerUpdateRequests.$inferInsert)['position'];

	const [inserted] = await db
		.insert(playerUpdateRequests)
		.values({
			playerId: playerId == null ? null : Number(playerId),
			name: str(get(all, 'name')),
			nickname: str(get(all, 'nickname')),
			clubName: str(get(all, 'club_name')),
			pictureUrl: str(get(all, 'picture_url')),
			associationId: str(get(all, 'association_id')),
			phone: str(get(all, 'phone')),
			email: str(get(all, 'email')),
			facebookProfile: str(get(all, 'facebook_profile')),
			birthDate: birthDate == null ? null : parseLegacyDate(birthDate),
			position,
			obs: str(get(all, 'obs')),
			team: str(get(all, 'team')),
			createdBy: createdBy && createdBy !== '0' ? createdBy : 'API',
			sourceData: sourceData == null ? null : phpJsonEncode(sourceData),
			status: 'pending',
			createdAt: now,
			updatedAt: now
		})
		.$returningId();

	return legacyJson(
		{
			success: true,
			message: `Player ${isCreate ? 'creation' : 'update'} request created successfully`,
			data: {
				id: inserted.id,
				// Eloquent echoed the attribute as it was set: the request value, as sent.
				player_id: playerId,
				request_type: isCreate ? 'create' : 'update',
				status: 'pending',
				created_at: carbonIsoFromDate(now)
			}
		},
		201
	);
}

/** Null when there is no such request (legacy 404). */
export async function showPlayerUpdateRequest(id: number) {
	const [row] = await db
		.select({
			id: playerUpdateRequests.id,
			playerId: playerUpdateRequests.playerId,
			status: playerUpdateRequests.status,
			createdBy: playerUpdateRequests.createdBy,
			reviewedAt: sql<string | null>`CAST(${playerUpdateRequests.reviewedAt} AS CHAR)`,
			createdAt: sql<string | null>`CAST(${playerUpdateRequests.createdAt} AS CHAR)`,
			updatedAt: sql<string | null>`CAST(${playerUpdateRequests.updatedAt} AS CHAR)`
		})
		.from(playerUpdateRequests)
		.where(eq(playerUpdateRequests.id, id))
		.limit(1);

	if (!row) return null;

	return {
		success: true,
		data: {
			id: row.id,
			player_id: row.playerId,
			status: row.status,
			created_by: row.createdBy,
			// Legacy called toISOString() on a plain string here and crashed once reviewed.
			reviewed_at: carbonIso(row.reviewedAt),
			created_at: carbonIso(row.createdAt),
			updated_at: carbonIso(row.updatedAt)
		}
	};
}
