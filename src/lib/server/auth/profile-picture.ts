import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '#lib/server/db/index.ts';
import { userProfiles } from '#lib/server/db/schema.ts';
import {
	USER_AVATARS_FOLDER,
	deleteFile,
	storageConfigured,
	storeFile
} from '#lib/server/storage.ts';

/** Legacy ImageOptimizer::AVATAR_SIZE / JPEG_QUALITY. */
const AVATAR_SIZE = 400;
const JPEG_QUALITY = 82;
/** The browser already shrinks photos; this only guards against direct posts. */
export const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;

export type PictureResult =
	{ ok: true } | { ok: false; reason: 'invalid' | 'too_large' | 'unavailable' | 'failed' };

async function currentPicture(userId: number) {
	const [row] = await db
		.select({ id: userProfiles.id, picture: userProfiles.picture })
		.from(userProfiles)
		.where(eq(userProfiles.userId, userId))
		.limit(1);
	return row ?? null;
}

async function savePicture(userId: number, picture: string | null) {
	const existing = await currentPicture(userId);
	const now = new Date();
	if (existing) {
		await db
			.update(userProfiles)
			.set({ picture, updatedAt: now })
			.where(eq(userProfiles.userId, userId));
	} else {
		await db.insert(userProfiles).values({ userId, picture, createdAt: now, updatedAt: now });
	}
	return existing?.picture ?? null;
}

/** Only files this feature wrote are ours to delete (social-login URLs and old paths stay). */
function deleteOld(path: string | null) {
	if (path?.startsWith(`${USER_AVATARS_FOLDER}/`)) void deleteFile(path);
}

/** Re-encodes any uploaded image as a 400×400 JPEG (strips metadata, fixes rotation). */
export async function setProfilePicture(userId: number, input: Uint8Array): Promise<PictureResult> {
	if (!storageConfigured()) return { ok: false, reason: 'unavailable' };
	if (input.byteLength > MAX_UPLOAD_BYTES) return { ok: false, reason: 'too_large' };

	let jpeg: Buffer;
	try {
		jpeg = await sharp(input, { limitInputPixels: 100_000_000 })
			.rotate()
			.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
			.flatten({ background: '#ffffff' })
			.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
			.toBuffer();
	} catch {
		return { ok: false, reason: 'invalid' };
	}

	try {
		const url = await storeFile(USER_AVATARS_FOLDER, jpeg, 'jpg', 'image/jpeg');
		deleteOld(await savePicture(userId, url));
		return { ok: true };
	} catch (error) {
		console.error('[profile-picture] upload failed:', error);
		return { ok: false, reason: 'failed' };
	}
}

export async function removeProfilePicture(userId: number): Promise<PictureResult> {
	try {
		deleteOld(await savePicture(userId, null));
		return { ok: true };
	} catch (error) {
		console.error('[profile-picture] remove failed:', error);
		return { ok: false, reason: 'failed' };
	}
}
