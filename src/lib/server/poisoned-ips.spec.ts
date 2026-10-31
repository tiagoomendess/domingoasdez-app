import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));

const { buildBlockList, matchesBlockList } = await import('./poisoned-ips');

describe('poisoned IP list', () => {
	const list = buildBlockList([
		'203.0.113.7',
		' 198.51.100.0/24 ',
		'2001:db8::/32',
		'nope',
		'1.2.3.4/99'
	]);

	it('matches addresses and ranges', () => {
		expect(matchesBlockList(list, '203.0.113.7')).toBe(true);
		expect(matchesBlockList(list, '198.51.100.200')).toBe(true);
		expect(matchesBlockList(list, '2001:db8:1::5')).toBe(true);
		expect(matchesBlockList(list, '::ffff:203.0.113.7')).toBe(true);
	});

	it('lets everyone else through', () => {
		expect(matchesBlockList(list, '203.0.113.8')).toBe(false);
		expect(matchesBlockList(list, '1.2.3.4')).toBe(false);
		expect(matchesBlockList(list, 'garbage')).toBe(false);
	});
});
