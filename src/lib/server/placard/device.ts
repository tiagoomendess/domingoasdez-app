/**
 * The TV side of a stadium screen. Replaces the old scoreboard-api's `GET /scoreboards/reserve`
 * and its `code` cookie (10 minutes, a new 4-digit code each time it expired, never freed, so the
 * 9000 codes ran out and the server hung).
 *
 * Each TV browser now has one `placards` row for good, found through a long-lived httpOnly
 * cookie with a random token (the row stores its sha256). Only the pairing code rotates: six
 * characters from an unambiguous alphabet, valid for 10 minutes, unique in the table.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { dev } from '$app/env';
import { PAIRING_ALPHABET, PAIRING_CODE_LENGTH } from '#lib/placard.ts';
import { db } from '#lib/server/db/index.ts';
import { placards } from '#lib/server/db/schema.ts';

export const DEVICE_COOKIE = 'dad_placard';
/** Browsers cap cookies at 400 days. */
const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const PAIRING_TTL_MS = 10 * 60_000;
/** Renew the code a little before it expires, so a phone never scans one that just died. */
const RENEW_BEFORE_MS = 30_000;
/** `last_seen_at` is written at most this often. */
const SEEN_EVERY_MS = 60_000;

export type PlacardRow = typeof placards.$inferSelect;

export const hashDeviceToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function randomPairingCode(random: (max: number) => number = randomInt): string {
	let code = '';
	for (let i = 0; i < PAIRING_CODE_LENGTH; i++)
		code += PAIRING_ALPHABET[random(PAIRING_ALPHABET.length)];
	return code;
}

export function isDuplicateKey(error: unknown): boolean {
	for (let current = error; current && typeof current === 'object';) {
		if ((current as { code?: unknown }).code === 'ER_DUP_ENTRY') return true;
		current = (current as { cause?: unknown }).cause;
	}
	return false;
}

/** Runs `write` with fresh codes until one is free (a clash is one in ~10⁸ per screen). */
async function withFreshCode<T>(write: (code: string) => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await write(randomPairingCode());
		} catch (error) {
			if (!isDuplicateKey(error) || attempt >= 4) throw error;
		}
	}
}

export async function findDevicePlacard(cookies: Cookies): Promise<PlacardRow | null> {
	const token = cookies.get(DEVICE_COOKIE);
	if (!token || !TOKEN_RE.test(token)) return null;
	const [row] = await db
		.select()
		.from(placards)
		.where(eq(placards.deviceTokenHash, hashDeviceToken(token)))
		.limit(1);
	return row ?? null;
}

/** A new screen for this browser, waiting to be paired. */
export async function createDevicePlacard(cookies: Cookies, now = new Date()): Promise<PlacardRow> {
	const token = randomBytes(32).toString('base64url');
	const deviceTokenHash = hashDeviceToken(token);
	await withFreshCode((code) =>
		db.insert(placards).values({
			deviceTokenHash,
			pairingCode: code,
			pairingCodeExpiresAt: new Date(now.getTime() + PAIRING_TTL_MS),
			lastSeenAt: now,
			createdAt: now,
			updatedAt: now
		})
	);
	cookies.set(DEVICE_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: DEVICE_COOKIE_MAX_AGE
	});
	const [row] = await db
		.select()
		.from(placards)
		.where(eq(placards.deviceTokenHash, deviceTokenHash))
		.limit(1);
	return row;
}

/** A screen waiting to pair always has a live code: a new one when it's missing or expiring. */
export async function ensurePairingCode(row: PlacardRow, now = new Date()): Promise<PlacardRow> {
	if (row.scene !== 'pairing') return row;
	const expiresAt = row.pairingCodeExpiresAt?.getTime() ?? 0;
	if (row.pairingCode && expiresAt - RENEW_BEFORE_MS > now.getTime()) return row;

	const pairingCodeExpiresAt = new Date(now.getTime() + PAIRING_TTL_MS);
	const pairingCode = await withFreshCode(async (code) => {
		await db
			.update(placards)
			.set({
				pairingCode: code,
				pairingCodeExpiresAt,
				version: sql`${placards.version} + 1`,
				updatedAt: now
			})
			.where(eq(placards.id, row.id));
		return code;
	});
	return { ...row, pairingCode, pairingCodeExpiresAt, version: row.version + 1 };
}

/** Heartbeat for the admin's "online" badge and the 30-day cleanup. */
export async function touchLastSeen(row: PlacardRow, now = new Date()): Promise<void> {
	if (row.lastSeenAt && now.getTime() - row.lastSeenAt.getTime() < SEEN_EVERY_MS) return;
	await db.update(placards).set({ lastSeenAt: now }).where(eq(placards.id, row.id));
}
