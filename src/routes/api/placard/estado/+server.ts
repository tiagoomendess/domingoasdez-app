import { error } from '@sveltejs/kit';
import type { PlacardUnchanged } from '#lib/placard.ts';
import { createRateLimit } from '#lib/server/placard/access.ts';
import {
	createDevicePlacard,
	ensurePairingCode,
	findDevicePlacard,
	touchLastSeen
} from '#lib/server/placard/device.ts';
import { publicState, releaseIfStale } from '#lib/server/placard/store.ts';
import type { RequestHandler } from './$types';

/** New screens per client IP: a stadium has a few TVs, a crawler running scripts has many. */
const newScreens = createRateLimit(10, 60 * 60_000);

function clientIp(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}

/**
 * The TV's poll (every second). Identifies the screen by its cookie, creating it on the first
 * call, and answers `{ version, serverNow, unchanged }` while `?v=` is still current, else the
 * whole state. Never cached.
 */
export const GET: RequestHandler = async ({ cookies, url, setHeaders, getClientAddress }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const now = new Date();

	let row = await findDevicePlacard(cookies);
	if (!row) {
		const ip = clientIp(getClientAddress);
		if (!newScreens.allowed(ip)) error(429, 'Too many new screens');
		row = await createDevicePlacard(cookies, now);
		newScreens.hit(ip);
	}
	row = await releaseIfStale(row, now);
	row = await ensurePairingCode(row, now);
	await touchLastSeen(row, now);

	if (url.searchParams.get('v') === String(row.version)) {
		return Response.json({
			version: row.version,
			serverNow: now.getTime(),
			unchanged: true
		} satisfies PlacardUnchanged);
	}
	return Response.json(await publicState(row, { origin: url.origin, withQr: true, now }));
};
