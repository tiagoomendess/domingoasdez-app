import { logger } from './log.ts';

const log = logger.child('cache');

export type SwrCacheOptions = {
	/** How long a value is served as is. */
	freshMs: number;
	/** How long after that a value is still served while one background load replaces it. */
	staleMs: number;
	/** Most keys kept; the least recently read goes first. */
	maxEntries: number;
};

type Entry<T> = {
	cached?: { value: T; storedAt: number };
	pending?: Promise<T>;
};

export type SwrCache<T> = {
	get(key: string, load: () => Promise<T>): Promise<T>;
};

/**
 * In-process stale-while-revalidate cache for data that is the same for every visitor. Prod runs
 * one Node process (ecosystem.config.cjs), so there is nothing to keep in sync; with more
 * processes each would keep its own copy. Concurrent misses share one load, and a failed
 * background load keeps the stale value until it runs out.
 */
export function swrCache<T>(
	name: string,
	{ freshMs, staleMs, maxEntries }: SwrCacheOptions
): SwrCache<T> {
	const entries = new Map<string, Entry<T>>();

	function load(key: string, entry: Entry<T>, loader: () => Promise<T>): Promise<T> {
		entry.pending ??= loader()
			.then((value) => {
				entry.cached = { value, storedAt: Date.now() };
				return value;
			})
			.catch((error: unknown) => {
				if (!entry.cached && entries.get(key) === entry) entries.delete(key);
				throw error;
			})
			.finally(() => {
				entry.pending = undefined;
			});
		return entry.pending;
	}

	return {
		get(key, loader) {
			const entry = entries.get(key) ?? {};
			// Map order is insertion order: re-inserting marks the key as most recently read.
			entries.delete(key);
			entries.set(key, entry);
			if (entries.size > maxEntries) entries.delete(entries.keys().next().value!);

			const age = entry.cached ? Date.now() - entry.cached.storedAt : Infinity;
			if (entry.cached && age < freshMs) return Promise.resolve(entry.cached.value);
			if (entry.cached && age < freshMs + staleMs) {
				if (!entry.pending) {
					load(key, entry, loader).catch((error: unknown) => {
						log.warn(`${name}: background refresh failed, serving stale`, { key }, error);
					});
				}
				return Promise.resolve(entry.cached.value);
			}
			return load(key, entry, loader);
		}
	};
}
