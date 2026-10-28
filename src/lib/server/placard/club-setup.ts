/**
 * A club's stadium screen setup (`/clubes/{club}/placard`): its look (text and background colours,
 * a background image) and its ad spots. The screen uses the setup of the game's home club.
 *
 * - The background image is re-encoded: cropped to 16:9 around the centre and resized to
 *   1920×1080 JPEG, so any photo works and the TV downloads little. The screen then covers with it.
 * - Ads are stored exactly as uploaded (GIFs keep their animation), so they're limited to 1 MB
 *   and to PNG, JPEG, GIF or WebP (told by their first bytes).
 */
import { and, asc, count, eq, inArray, max, sql } from 'drizzle-orm';
import sharp from 'sharp';
import type { AuthUser } from '#lib/auth/user.ts';
import {
	AD_MAX_BYTES,
	isAdDuration,
	MAX_ADS,
	sniffImage,
	type PlacardAdSpot
} from '#lib/placard.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubPlacardAds,
	clubPlacardSettings,
	games,
	placards,
	teams
} from '#lib/server/db/schema.ts';
import { logger } from '#lib/server/log.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { deleteFile, storageConfigured, storeFile } from '#lib/server/storage.ts';

const log = logger.child('placard-setup');

export const PLACARD_BACKGROUNDS_FOLDER = '/storage/uploads/placard/backgrounds';
export const PLACARD_ADS_FOLDER = '/storage/uploads/placard/ads';

const BACKGROUND_WIDTH = 1920;
const BACKGROUND_HEIGHT = 1080;
const JPEG_QUALITY = 80;
/** The browser shrinks photos before sending; this only guards against direct posts. */
export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

export type SetupResult =
	| { ok: true }
	| {
			ok: false;
			reason: 'invalid' | 'too_large' | 'too_many' | 'not_found' | 'unavailable' | 'failed';
	  };

/** The club's admin (`clubs.admin_user_id`), or anyone with the `admin` permission. */
export async function canManageClubPlacard(
	user: AuthUser | null,
	club: { adminUserId: number | null }
): Promise<boolean> {
	if (!user) return false;
	if (club.adminUserId === user.id) return true;
	return hasPermission(await getUserPermissionNames(user.id), 'admin');
}

export type ClubPlacardLook = {
	textColor: string | null;
	backgroundColor: string | null;
	backgroundImage: string | null;
};

export async function clubPlacardLook(clubId: number): Promise<ClubPlacardLook> {
	const [row] = await db
		.select()
		.from(clubPlacardSettings)
		.where(eq(clubPlacardSettings.clubId, clubId))
		.limit(1);
	return {
		textColor: row?.textColor ?? null,
		backgroundColor: row?.backgroundColor ?? null,
		backgroundImage: mediaUrl(row?.backgroundImage)
	};
}

/** The club's ad rows in rotation order (`image` is the stored `/storage/...` path). */
export async function clubAdRows(clubId: number) {
	return db
		.select()
		.from(clubPlacardAds)
		.where(eq(clubPlacardAds.clubId, clubId))
		.orderBy(asc(clubPlacardAds.position), asc(clubPlacardAds.id));
}

/** The club's ad spots in rotation order, with browser URLs. */
export async function clubAdSpots(clubId: number): Promise<PlacardAdSpot[]> {
	return (await clubAdRows(clubId)).map((row) => ({
		id: row.id,
		image: mediaUrl(row.image) ?? '',
		durationSeconds: row.durationSeconds
	}));
}

/**
 * Screens showing a home game of the club get a new `version`, so the TV and the controller fetch
 * the new look or ad list on their next poll instead of keeping the one they have.
 */
async function refreshClubScreens(clubId: number) {
	const homeGames = db
		.select({ id: games.id })
		.from(games)
		.innerJoin(teams, eq(teams.id, games.homeTeamId))
		.where(eq(teams.clubId, clubId));
	await db
		.update(placards)
		.set({ version: sql`${placards.version} + 1` })
		.where(and(eq(placards.scene, 'match'), inArray(placards.gameId, homeGames)));
}

/** Creates the settings row on first use, then applies `values`; returns the previous row. */
async function updateSettings(
	clubId: number,
	values: Partial<Omit<typeof clubPlacardSettings.$inferInsert, 'id' | 'clubId'>>
) {
	const now = new Date();
	const [previous] = await db
		.select()
		.from(clubPlacardSettings)
		.where(eq(clubPlacardSettings.clubId, clubId))
		.limit(1);
	if (previous) {
		await db
			.update(clubPlacardSettings)
			.set({ ...values, updatedAt: now })
			.where(eq(clubPlacardSettings.id, previous.id));
	} else {
		await db
			.insert(clubPlacardSettings)
			.values({ clubId, ...values, createdAt: now, updatedAt: now });
	}
	await refreshClubScreens(clubId);
	return previous ?? null;
}

/** Null colours go back to the default look. */
export async function saveColors(
	clubId: number,
	colors: { textColor: string | null; backgroundColor: string | null }
): Promise<SetupResult> {
	await updateSettings(clubId, colors);
	return { ok: true };
}

/** Only files this feature wrote are ours to delete. */
function deleteOwn(path: string | null | undefined, folder: string) {
	if (path?.startsWith(`${folder}/`)) void deleteFile(path);
}

export async function setBackgroundImage(clubId: number, input: Uint8Array): Promise<SetupResult> {
	if (!storageConfigured()) return { ok: false, reason: 'unavailable' };
	if (input.byteLength > MAX_BACKGROUND_BYTES) return { ok: false, reason: 'too_large' };

	let jpeg: Buffer;
	try {
		jpeg = await sharp(input, { limitInputPixels: 100_000_000 })
			.rotate()
			.resize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT, { fit: 'cover', position: 'centre' })
			.flatten({ background: '#000000' })
			.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
			.toBuffer();
	} catch {
		return { ok: false, reason: 'invalid' };
	}

	try {
		const url = await storeFile(PLACARD_BACKGROUNDS_FOLDER, jpeg, 'jpg', 'image/jpeg');
		const previous = await updateSettings(clubId, { backgroundImage: url });
		deleteOwn(previous?.backgroundImage, PLACARD_BACKGROUNDS_FOLDER);
		return { ok: true };
	} catch (error) {
		log.error('background upload failed', error);
		return { ok: false, reason: 'failed' };
	}
}

export async function removeBackgroundImage(clubId: number): Promise<SetupResult> {
	const previous = await updateSettings(clubId, { backgroundImage: null });
	deleteOwn(previous?.backgroundImage, PLACARD_BACKGROUNDS_FOLDER);
	return { ok: true };
}

export async function addAd(
	clubId: number,
	input: Uint8Array,
	durationSeconds: number
): Promise<SetupResult> {
	if (!isAdDuration(durationSeconds)) return { ok: false, reason: 'invalid' };
	if (!storageConfigured()) return { ok: false, reason: 'unavailable' };
	if (input.byteLength > AD_MAX_BYTES) return { ok: false, reason: 'too_large' };
	const format = sniffImage(input);
	if (!format) return { ok: false, reason: 'invalid' };
	try {
		// Readable as an image (not just the right first bytes), and not absurdly large.
		const meta = await sharp(input, { animated: true, limitInputPixels: 50_000_000 }).metadata();
		if (!meta.width || !meta.height) return { ok: false, reason: 'invalid' };
	} catch {
		return { ok: false, reason: 'invalid' };
	}

	const [{ total, last }] = await db
		.select({ total: count(), last: max(clubPlacardAds.position) })
		.from(clubPlacardAds)
		.where(eq(clubPlacardAds.clubId, clubId));
	if (total >= MAX_ADS) return { ok: false, reason: 'too_many' };

	try {
		const url = await storeFile(PLACARD_ADS_FOLDER, input, format.extension, format.type);
		const now = new Date();
		await db.insert(clubPlacardAds).values({
			clubId,
			image: url,
			durationSeconds,
			position: last === null ? 0 : last + 1,
			createdAt: now,
			updatedAt: now
		});
		await refreshClubScreens(clubId);
		return { ok: true };
	} catch (error) {
		log.error('ad upload failed', error);
		return { ok: false, reason: 'failed' };
	}
}

export async function updateAdDuration(
	clubId: number,
	adId: number,
	durationSeconds: number
): Promise<SetupResult> {
	if (!isAdDuration(durationSeconds)) return { ok: false, reason: 'invalid' };
	const [result] = await db
		.update(clubPlacardAds)
		.set({ durationSeconds, updatedAt: new Date() })
		.where(and(eq(clubPlacardAds.id, adId), eq(clubPlacardAds.clubId, clubId)));
	if (result.affectedRows === 0) return { ok: false, reason: 'not_found' };
	await refreshClubScreens(clubId);
	return { ok: true };
}

/** Writes positions 0…n-1 in the given order. */
async function renumber(ids: number[]) {
	await Promise.all(
		ids.map((id, position) =>
			db.update(clubPlacardAds).set({ position }).where(eq(clubPlacardAds.id, id))
		)
	);
}

/** Swaps the ad with its neighbour (`-1` earlier, `1` later) in the rotation. */
export async function moveAd(
	clubId: number,
	adId: number,
	direction: -1 | 1
): Promise<SetupResult> {
	const ids = (await clubAdSpots(clubId)).map((ad) => ad.id);
	const index = ids.indexOf(adId);
	if (index < 0) return { ok: false, reason: 'not_found' };
	const target = index + direction;
	if (target < 0 || target >= ids.length) return { ok: true };
	[ids[index], ids[target]] = [ids[target], ids[index]];
	await renumber(ids);
	await refreshClubScreens(clubId);
	return { ok: true };
}

export async function deleteAd(clubId: number, adId: number): Promise<SetupResult> {
	const [row] = await db
		.select({ image: clubPlacardAds.image })
		.from(clubPlacardAds)
		.where(and(eq(clubPlacardAds.id, adId), eq(clubPlacardAds.clubId, clubId)))
		.limit(1);
	if (!row) return { ok: false, reason: 'not_found' };
	// Screens that had it preselected fall back to the first ad (`placards.next_ad_id` set null).
	await db.delete(clubPlacardAds).where(eq(clubPlacardAds.id, adId));
	await renumber((await clubAdSpots(clubId)).map((ad) => ad.id));
	deleteOwn(row.image, PLACARD_ADS_FOLDER);
	await refreshClubScreens(clubId);
	return { ok: true };
}
