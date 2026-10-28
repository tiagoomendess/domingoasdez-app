/**
 * Polls a stadium screen's state (`/api/placard/estado` on the TV, `/api/placard/{id}` on the
 * controller) and keeps the offset between this device's clock and the server's, so the clock is
 * drawn in server time. Polls never overlap (the next one is scheduled after the previous one
 * ends), which the old screen's `setInterval` didn't guarantee: a slow answer could bring an older
 * score back.
 */
import type { PlacardPublicState, PlacardUnchanged } from '#lib/placard.ts';

type Options = {
	url: string;
	intervalMs: number;
	initial: PlacardPublicState | null;
	/** Skip polls while the tab is hidden (the controller); the TV always polls. */
	pauseWhenHidden?: boolean;
};

export class PlacardPoll {
	state = $state.raw<PlacardPublicState | null>(null);
	/** Server clock minus this device's clock, in ms. */
	offset = $state(0);
	/** Polls failed in a row; the screen shows "no connection" from 3. */
	failures = $state(0);
	/** HTTP status of the last failed poll (401, 404…), or null. */
	errorStatus = $state<number | null>(null);

	#options: Options;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#running = false;
	#hasOffset = false;

	constructor(options: Options) {
		this.#options = options;
		if (options.initial) {
			this.state = options.initial;
			this.offset = options.initial.serverNow - Date.now();
		}
	}

	/** Server time now, by this device's clock plus the offset. */
	serverNow(local = Date.now()): number {
		return local + this.offset;
	}

	/** `serverNow` of a response, sent between `sentAt` and `receivedAt` (local clock). */
	#sample(serverNow: number, sentAt: number, receivedAt: number) {
		const sample = serverNow - (sentAt + receivedAt) / 2;
		// Smooth out jitter, but take the first sample (and big jumps, e.g. a clock change) as is.
		this.offset =
			!this.#hasOffset || Math.abs(sample - this.offset) > 5_000
				? sample
				: this.offset + (sample - this.offset) * 0.25;
		this.#hasOffset = true;
	}

	/** Takes a state the server just sent (an action's answer). */
	accept(state: PlacardPublicState, sentAt: number, receivedAt = Date.now()) {
		this.#sample(state.serverNow, sentAt, receivedAt);
		if (!this.state || state.version >= this.state.version || state.id !== this.state.id) {
			this.state = state;
		}
	}

	async refresh(): Promise<void> {
		const version = this.state?.version;
		const url = version === undefined ? this.#options.url : `${this.#options.url}?v=${version}`;
		const sentAt = Date.now();
		try {
			const response = await fetch(url, { cache: 'no-store' });
			if (!response.ok) {
				this.failures++;
				this.errorStatus = response.status;
				return;
			}
			const body = (await response.json()) as PlacardPublicState | PlacardUnchanged;
			const receivedAt = Date.now();
			this.failures = 0;
			this.errorStatus = null;
			if ('unchanged' in body) this.#sample(body.serverNow, sentAt, receivedAt);
			else this.accept(body, sentAt, receivedAt);
		} catch {
			this.failures++;
		}
	}

	#schedule() {
		if (!this.#running) return;
		this.#timer = setTimeout(async () => {
			if (!(this.#options.pauseWhenHidden && document.visibilityState === 'hidden')) {
				await this.refresh();
			}
			this.#schedule();
		}, this.#options.intervalMs);
	}

	/** Starts polling (right away), and returns the function that stops it. */
	start(): () => void {
		this.#running = true;
		void this.refresh().then(() => this.#schedule());
		return () => {
			this.#running = false;
			if (this.#timer) clearTimeout(this.#timer);
		};
	}
}
