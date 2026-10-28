import { describe, expect, it, vi } from 'vitest';
import { PAIRING_ALPHABET } from '#lib/placard.ts';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));
vi.mock('$app/env', () => ({ dev: true }));

const { hashDeviceToken, isDuplicateKey, randomPairingCode } = await import('./device.ts');
const { FINISHED_RELEASE_MS, IDLE_RELEASE_MS, shouldRelease } = await import('./store.ts');

type Row = Parameters<typeof shouldRelease>[0];
type Game = NonNullable<Parameters<typeof shouldRelease>[1]>;

const now = new Date('2026-10-25T16:00:00Z');
const row = (overrides: Partial<Row> = {}) =>
	({
		id: 1,
		scene: 'match',
		gameId: 10,
		lastActionAt: now,
		pairedAt: now,
		...overrides
	}) as Row;
const game = (finished: boolean) => ({ id: 10, finished }) as Game;
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('pairing codes', () => {
	it('draws six characters from the unambiguous alphabet', () => {
		let i = 0;
		const code = randomPairingCode(() => i++);
		expect(code).toBe(PAIRING_ALPHABET.slice(0, 6));
		for (let n = 0; n < 50; n++) expect(randomPairingCode()).toMatch(/^[2-9A-HJKMNP-Z]{6}$/);
	});

	it('spots a duplicate key, also when drizzle wraps the driver error', () => {
		expect(isDuplicateKey({ code: 'ER_DUP_ENTRY' })).toBe(true);
		expect(isDuplicateKey(new Error('query failed', { cause: { code: 'ER_DUP_ENTRY' } }))).toBe(
			true
		);
		expect(isDuplicateKey(new Error('other'))).toBe(false);
	});

	it('stores only a hash of the device token', () => {
		expect(hashDeviceToken('token')).toMatch(/^[0-9a-f]{64}$/);
		expect(hashDeviceToken('token')).not.toContain('token');
	});
});

describe('shouldRelease', () => {
	it('keeps a screen in use', () => {
		expect(shouldRelease(row(), game(false), now)).toBe(false);
		expect(shouldRelease(row({ scene: 'pairing', gameId: null }), null, now)).toBe(false);
	});

	it('releases a screen whose game is gone', () => {
		expect(shouldRelease(row(), null, now)).toBe(true);
	});

	it('releases after 6 h idle, or 1 h idle once the game is finished', () => {
		expect(shouldRelease(row({ lastActionAt: ago(IDLE_RELEASE_MS - 1) }), game(false), now)).toBe(
			false
		);
		expect(shouldRelease(row({ lastActionAt: ago(IDLE_RELEASE_MS) }), game(false), now)).toBe(true);
		expect(
			shouldRelease(row({ lastActionAt: ago(FINISHED_RELEASE_MS - 1) }), game(true), now)
		).toBe(false);
		expect(shouldRelease(row({ lastActionAt: ago(FINISHED_RELEASE_MS) }), game(true), now)).toBe(
			true
		);
	});
});
