import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const warn = vi.hoisted(() => vi.fn());

vi.mock('./log.ts', () => ({ logger: { child: () => ({ warn }) } }));

const { swrCache } = await import('./cache.ts');

const options = { freshMs: 1_000, staleMs: 5_000, maxEntries: 2 };

/** Lets a background load settle (only `Date` is faked, so real timers still run). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A loader that resolves to `value-1`, `value-2`, … on each call. */
function counter() {
	let calls = 0;
	return vi.fn(async () => `value-${++calls}`);
}

describe('swrCache', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		warn.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('serves a fresh value without loading again', async () => {
		const cache = swrCache<string>('test', options);
		const load = counter();

		expect(await cache.get('a', load)).toBe('value-1');
		vi.advanceTimersByTime(999);
		expect(await cache.get('a', load)).toBe('value-1');
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('serves a stale value while one background load replaces it', async () => {
		const cache = swrCache<string>('test', options);
		const load = counter();

		await cache.get('a', load);
		vi.advanceTimersByTime(1_000);
		expect(await Promise.all([cache.get('a', load), cache.get('a', load)])).toEqual([
			'value-1',
			'value-1'
		]);
		await settle();
		expect(await cache.get('a', load)).toBe('value-2');
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('waits for a new load once the stale window is over', async () => {
		const cache = swrCache<string>('test', options);
		const load = counter();

		await cache.get('a', load);
		vi.advanceTimersByTime(6_000);
		expect(await cache.get('a', load)).toBe('value-2');
	});

	it('shares one load between concurrent misses', async () => {
		const cache = swrCache<string>('test', options);
		const load = counter();

		const [first, second] = await Promise.all([cache.get('a', load), cache.get('a', load)]);
		expect([first, second]).toEqual(['value-1', 'value-1']);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('does not keep a failed load', async () => {
		const cache = swrCache<string>('test', options);
		const load = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue('ok');

		await expect(cache.get('a', load)).rejects.toThrow('db down');
		expect(await cache.get('a', load)).toBe('ok');
	});

	it('keeps the stale value when a background load fails', async () => {
		const cache = swrCache<string>('test', options);
		const load = vi.fn().mockResolvedValueOnce('old').mockRejectedValueOnce(new Error('db down'));

		await cache.get('a', load);
		vi.advanceTimersByTime(1_000);
		expect(await cache.get('a', load)).toBe('old');
		await settle();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(await cache.get('a', vi.fn().mockResolvedValue('new'))).toBe('old');
	});

	it('drops the least recently read key past maxEntries', async () => {
		const cache = swrCache<string>('test', options);
		const load = counter();

		await cache.get('a', load);
		await cache.get('b', load);
		await cache.get('a', load);
		await cache.get('c', load);
		expect(load).toHaveBeenCalledTimes(3);

		expect(await cache.get('a', load)).toBe('value-1');
		expect(await cache.get('b', load)).toBe('value-4');
	});
});
