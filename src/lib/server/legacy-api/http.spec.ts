import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));

const { auditTokenValue, hitThrottle, parseAccessToken, resetThrottle } = await import('./http.ts');

describe('parseAccessToken', () => {
	it('strips Bearer and escaped quotes, then trims', () => {
		expect(parseAccessToken('Bearer abc123')).toBe('abc123');
		expect(parseAccessToken('abc123')).toBe('abc123');
		expect(parseAccessToken('Bearer \\"abc123\\"')).toBe('abc123');
	});

	it('treats a missing or falsy header as no token', () => {
		expect(parseAccessToken(null)).toBeNull();
		expect(parseAccessToken('')).toBeNull();
		expect(parseAccessToken('0')).toBeNull();
	});

	it('keeps an emptied token as an (invalid) empty string', () => {
		expect(parseAccessToken('Bearer')).toBe('');
	});
});

describe('hitThrottle', () => {
	beforeEach(() => resetThrottle());

	it('allows 240 requests a minute per key, then refuses until the window resets', () => {
		const t0 = 1_000_000;
		for (let i = 0; i < 239; i++) hitThrottle('1.2.3.4', t0);
		expect(hitThrottle('1.2.3.4', t0)).toEqual({ allowed: true, remaining: 0, retryAfter: 60 });
		expect(hitThrottle('1.2.3.4', t0 + 1000).allowed).toBe(false);
		expect(hitThrottle('5.6.7.8', t0 + 1000).allowed).toBe(true);
		expect(hitThrottle('1.2.3.4', t0 + 60_000)).toMatchObject({ allowed: true, remaining: 239 });
	});
});

describe('auditTokenValue', () => {
	it('json-encodes the token like PHP', () => {
		expect(auditTokenValue('abc/def')).toBe(
			JSON.stringify('abc/def').replace('/', String.fromCharCode(92) + '/')
		);
	});

	it('is null when the raw header bytes are not UTF-8 (json_encode failed)', () => {
		// "é" sent as the single latin1 byte 0xE9, as Node's fetch does.
		expect(auditTokenValue('wrong-é')).toBeNull();
	});
});
