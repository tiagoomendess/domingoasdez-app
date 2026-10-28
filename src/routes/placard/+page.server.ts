import { ensurePairingCode, findDevicePlacard } from '#lib/server/placard/device.ts';
import { publicState, releaseIfStale } from '#lib/server/placard/store.ts';
import type { PageServerLoad } from './$types';

/**
 * The stadium screen (TV). A browser that already has a screen gets its state straight away; a new
 * one gets it from its first poll of `/api/placard/estado`, which creates the screen. Creating it
 * here would give a row to every crawler that opens the page.
 */
export const load: PageServerLoad = async ({ cookies, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const now = new Date();
	const found = await findDevicePlacard(cookies);
	if (!found) return { initial: null };
	const row = await ensurePairingCode(await releaseIfStale(found, now), now);
	return { initial: await publicState(row, { origin: url.origin, withQr: true, now }) };
};
