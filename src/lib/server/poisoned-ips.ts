import { BlockList, isIP } from 'node:net';
import { swrCache } from './cache.ts';
import { db } from '#lib/server/db/index.ts';
import { poisonedIps } from '#lib/server/db/schema.ts';
import { logger } from './log.ts';

const log = logger.child('poisoned-ips');

/**
 * The `poisoned_ips` list (edited in the admin), read at most once a minute. Entries are one
 * address or a CIDR range; anything else is skipped with a warning.
 */
const listCache = swrCache<BlockList>('poisoned ips', {
	freshMs: 60_000,
	staleMs: 10 * 60_000,
	maxEntries: 1
});

export function buildBlockList(entries: string[]): BlockList {
	const list = new BlockList();
	for (const raw of entries) {
		const entry = raw.trim();
		const [address, prefix] = entry.split('/');
		const family = isIP(address);
		if (!family) {
			log.warn('skipping an invalid entry', { entry });
			continue;
		}
		const type = family === 4 ? 'ipv4' : 'ipv6';
		if (prefix === undefined) {
			list.addAddress(address, type);
			continue;
		}
		const bits = Number(prefix);
		if (!Number.isInteger(bits) || bits < 0 || bits > (family === 4 ? 32 : 128)) {
			log.warn('skipping an invalid entry', { entry });
			continue;
		}
		list.addSubnet(address, bits, type);
	}
	return list;
}

/** Whether `ip` is in the list. IPv4-mapped IPv6 (`::ffff:1.2.3.4`) counts as the IPv4. */
export function matchesBlockList(list: BlockList, ip: string): boolean {
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
	const address = mapped ?? ip;
	const family = isIP(address);
	if (!family) return false;
	return list.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/** Whether this client gets poisoned data. A failed read of the list lets everyone through. */
export async function isPoisonedIp(ip: string | undefined): Promise<boolean> {
	if (!ip) return false;
	try {
		const list = await listCache.get('all', async () => {
			const rows = await db.select({ ip: poisonedIps.ip }).from(poisonedIps);
			return buildBlockList(rows.map((row) => row.ip));
		});
		return matchesBlockList(list, ip);
	} catch (error) {
		log.error('could not read the list', error);
		return false;
	}
}
