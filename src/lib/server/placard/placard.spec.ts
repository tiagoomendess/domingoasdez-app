import { describe, expect, it, vi } from 'vitest';
import { PAIRING_ALPHABET } from '#lib/placard.ts';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));
vi.mock('$app/env', () => ({ dev: true }));
vi.mock('#lib/server/media.ts', () => ({
	mediaUrl: (path: string | null) => (path ? `https://media${path}` : null)
}));
vi.mock('#lib/server/storage.ts', () => ({}));

const { hashDeviceToken, isDuplicateKey, randomPairingCode } = await import('./device.ts');
const { FINISHED_RELEASE_MS, IDLE_RELEASE_MS, currentOverlay, overlayActive, shouldRelease } =
	await import('./store.ts');

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

describe('currentOverlay', () => {
	const at = (iso: string) => new Date(`2026-10-25T16:00:${iso}Z`);
	const withAd = (overrides: Partial<Row> = {}) =>
		row({
			overlayType: 'ad',
			overlayPayload: { adId: 3, image: '/storage/ad.gif' },
			overlayStartedAt: at('00.000'),
			overlayEndsAt: at('10.000'),
			...overrides
		});

	it('shows an ad until it ends', () => {
		expect(currentOverlay(withAd(), at('05.000'))).toEqual({
			type: 'ad',
			startedAt: at('00.000').getTime(),
			endsAt: at('10.000').getTime(),
			ad: { id: 3, image: 'https://media/storage/ad.gif' }
		});
		expect(currentOverlay(withAd(), at('10.000'))).toBeNull();
	});

	it('ignores unknown or broken overlays', () => {
		expect(currentOverlay(withAd({ overlayType: 'confetti' }), at('05.000'))).toBeNull();
		expect(currentOverlay(withAd({ overlayPayload: { adId: 3 } }), at('05.000'))).toBeNull();
		expect(currentOverlay(row(), at('05.000'))).toBeNull();
	});
});

describe('substitution overlay', () => {
	const at = (s: string) => new Date(`2026-10-25T16:00:${s}Z`);
	const game = {
		home: { name: 'Negreiros', emblem: 'https://media/n.png' },
		away: { name: 'Bastuço', emblem: 'https://media/b.png' }
	};
	const sub = row({
		overlayType: 'substitution',
		overlayPayload: {
			side: 'away',
			out: { id: 1, name: 'Rui', picture: '/storage/rui.jpg' },
			in: { id: 2, name: 'Zé', picture: null }
		},
		overlayStartedAt: at('00.000'),
		overlayEndsAt: at('10.000')
	});

	it('shows the side’s team and both players, photos as URLs', () => {
		expect(currentOverlay(sub, at('03.000'), game)).toMatchObject({
			type: 'substitution',
			side: 'away',
			team: game.away,
			out: { id: 1, name: 'Rui', picture: 'https://media/storage/rui.jpg' },
			in: { id: 2, name: 'Zé', picture: null }
		});
	});

	it('needs the game, and counts as busy until it ends whatever its type', () => {
		expect(currentOverlay(sub, at('03.000'))).toBeNull();
		expect(overlayActive(sub, at('09.999'))).toBe(true);
		expect(overlayActive(sub, at('10.000'))).toBe(false);
	});
});

describe('message overlay', () => {
	const at = (s: string) => new Date(`2026-10-25T16:00:${s}Z`);
	const message = (text: unknown) =>
		row({
			overlayType: 'message',
			overlayPayload: { text },
			overlayStartedAt: at('00.000'),
			overlayEndsAt: at('15.000')
		});

	it('shows the text until it ends', () => {
		expect(currentOverlay(message('Rifa: 1443'), at('14.000'))).toMatchObject({
			type: 'message',
			text: 'Rifa: 1443'
		});
		expect(currentOverlay(message('Rifa: 1443'), at('15.000'))).toBeNull();
	});

	it('drops a stored text that is empty or too long', () => {
		expect(currentOverlay(message(''), at('01.000'))).toBeNull();
		expect(currentOverlay(message('x'.repeat(121)), at('01.000'))).toBeNull();
	});
});
