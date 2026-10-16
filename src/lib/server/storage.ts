import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	R2_ACCESS_KEY_ID,
	R2_BUCKET,
	R2_ENDPOINT,
	R2_REGION,
	R2_SECRET_ACCESS_KEY
} from '$app/env/private';

/** Public path prefix stored in the database; the R2 object key is the same path without `/`. */
export const STORAGE_URL_PREFIX = '/storage/';
export const USER_AVATARS_FOLDER = '/storage/uploads/users/avatars';

const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';

let client: S3Client | undefined;

export function storageConfigured(): boolean {
	return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

function r2() {
	if (!storageConfigured()) throw new Error('Cloudflare R2 is not configured');
	client ??= new S3Client({
		region: R2_REGION,
		endpoint: R2_ENDPOINT,
		credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
		// R2 rejects the CRC32 checksums newer SDK versions add by default.
		requestChecksumCalculation: 'WHEN_REQUIRED',
		responseChecksumValidation: 'WHEN_REQUIRED'
	});
	return { client, bucket: R2_BUCKET };
}

/** Uploads under a new random name in `folderUrl` and returns the `/storage/...` path to save. */
export async function storeFile(
	folderUrl: string,
	body: Uint8Array,
	extension: string,
	contentType: string
): Promise<string> {
	const url = `${folderUrl.replace(/\/+$/, '')}/${crypto.randomUUID()}.${extension}`;
	const { client, bucket } = r2();
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: url.slice(1),
			Body: body,
			ContentType: contentType,
			CacheControl: CACHE_IMMUTABLE
		})
	);
	return url;
}

/** Best effort: a missing file must never break the flow that replaces it. */
export async function deleteFile(url: string | null | undefined): Promise<void> {
	if (!url?.startsWith(STORAGE_URL_PREFIX) || url.includes('..')) return;
	try {
		const { client, bucket } = r2();
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: url.slice(1) }));
	} catch (error) {
		console.warn(`[storage] failed to delete ${url}:`, error);
	}
}
