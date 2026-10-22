import { tick } from 'svelte';
import { Tween, prefersReducedMotion } from 'svelte/motion';
import { cubicIn, cubicOut, quintOut } from 'svelte/easing';

/** 1 = next (swipe left), -1 = previous (swipe right). */
export type Direction = 1 | -1;

type Options = {
	/** False at the first/last page: the content rubber-bands instead. */
	canGo: (dir: Direction) => boolean;
	/** Runs as the change starts, while the old content slides out (e.g. move a selection). */
	onstart?: (dir: Direction) => void;
	/** Swaps the content. Runs while it's off-screen; the new content slides in once it resolves. */
	change: (dir: Direction) => void | Promise<void>;
	/** A touch has just become a swipe in this direction (e.g. preload the next page). */
	onintent?: (dir: Direction) => void;
	/** Touches that belong to something else. Sheets, popovers and sideways scrollers are always skipped. */
	ignore?: (target: Element) => boolean;
};

/** Travel before a touch counts as a swipe or a scroll; below it, it's a tap. */
const SLOP = 10;
/** How far past the first or last page the content stretches. */
const RUBBER = 64;
/** px/ms: a quick flick changes page even when it's short. */
const FLICK = 0.4;
/** ms for the old page to leave from rest; a swipe already partway out takes less. */
const EXIT_MS = 145;
/** ms for the new page to slide in. */
const ENTER_MS = 225;
/** ms for a swipe that didn't commit to spring back. */
const SETTLE_MS = 180;

/**
 * Horizontal swipe between peer pages (competition rounds, game days), with the content
 * following the finger, then sliding out while the next page slides in. Buttons call `go()`
 * for the same animation.
 *
 * Nothing in the DOM changes until a touch has become a swipe. iOS Safari drops a scroll
 * that has already started (the date rail, a carousel) if a layer around it changes mid-touch.
 */
export class SwipePager {
	readonly offset = new Tween(0);
	readonly opacity = new Tween(1);
	/** Width of the sliding content; bind it with `bind:clientWidth`. */
	width = $state(0);

	#options: Options;
	// Plain fields, not $state: see the class comment
	#busy = false;
	#tracking = false;
	#swiping = false;
	#startX = 0;
	#startY = 0;
	#dx = 0;
	#lastX = 0;
	#lastT = 0;
	#velocity = 0;
	#suppressClickUntil = 0;

	constructor(options: Options) {
		this.#options = options;
	}

	/** Inline styles for the sliding content. Nothing at rest, so no transform lingers. */
	get transform() {
		return this.offset.current !== 0 ? `translateX(${this.offset.current}px)` : undefined;
	}

	get fade() {
		return this.opacity.current !== 1 ? this.opacity.current : undefined;
	}

	/** Slides the current page out, swaps it, and slides the new one in. */
	go = async (dir: Direction) => {
		if (this.#busy || !this.#options.canGo(dir)) return;
		this.#busy = true;
		const width = this.width;
		this.#options.onstart?.(dir);
		try {
			if (prefersReducedMotion.current || !width) {
				await this.opacity.set(0, { duration: 75 });
				await this.offset.set(0, { duration: 0 });
				await this.#options.change(dir);
				await tick();
				await this.opacity.set(1, { duration: 75 });
			} else {
				const remaining = width - Math.abs(this.offset.current);
				await this.offset.set(-dir * width, {
					duration: Math.max(65, (EXIT_MS * remaining) / width),
					easing: cubicIn
				});
				await this.#options.change(dir);
				await tick();
				await this.offset.set(dir * width, { duration: 0 });
				await this.offset.set(0, { duration: ENTER_MS, easing: quintOut });
			}
		} finally {
			this.#busy = false;
		}
	};

	/** Listens on `target` (an element, or `document` for a whole page). Returns the cleanup. */
	listen = (target: HTMLElement | Document) => {
		const root = target instanceof Document ? target.documentElement : target;
		const start = (event: TouchEvent) => this.#ontouchstart(event, root);
		const move = (event: TouchEvent) => this.#ontouchmove(event);
		const end = () => this.#ontouchend(false);
		const cancel = () => this.#ontouchend(true);
		// The finger lifting at the end of a swipe must not open the link under it
		const click = (event: Event) => {
			if (performance.now() >= this.#suppressClickUntil) return;
			event.preventDefault();
			event.stopPropagation();
		};
		const options = { capture: true };
		target.addEventListener('touchstart', start as EventListener, { passive: true });
		// Not passive, so a swipe can stop the page from scrolling under it
		target.addEventListener('touchmove', move as EventListener, { passive: false });
		target.addEventListener('touchend', end);
		target.addEventListener('touchcancel', cancel);
		target.addEventListener('click', click, options);
		return () => {
			target.removeEventListener('touchstart', start as EventListener);
			target.removeEventListener('touchmove', move as EventListener);
			target.removeEventListener('touchend', end);
			target.removeEventListener('touchcancel', cancel);
			target.removeEventListener('click', click, options);
		};
	};

	#follow(delta: number) {
		const dir: Direction = delta < 0 ? 1 : -1;
		if (this.#options.canGo(dir)) return delta;
		// Rubber-band at the first/last page
		const t = Math.abs(delta);
		return Math.sign(delta) * (1 - 1 / ((t * 0.55) / RUBBER + 1)) * RUBBER;
	}

	#ignored(event: TouchEvent, root: Element) {
		if (this.#busy || event.touches.length !== 1) return true;
		const target = event.target instanceof Element ? event.target : null;
		if (!target || target.closest('dialog, [popover]')) return true;
		if (this.#options.ignore?.(target)) return true;
		// Something that scrolls sideways itself (the date rail, a wide table) keeps its swipe
		for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
			if (el.scrollWidth <= el.clientWidth + 1) continue;
			const { overflowX } = getComputedStyle(el);
			if (overflowX === 'auto' || overflowX === 'scroll') return true;
		}
		return false;
	}

	#ontouchstart(event: TouchEvent, root: Element) {
		this.#tracking = false;
		if (this.#ignored(event, root)) return;
		const touch = event.touches[0];
		this.#startX = this.#lastX = touch.clientX;
		this.#startY = touch.clientY;
		this.#lastT = event.timeStamp;
		this.#dx = 0;
		this.#velocity = 0;
		this.#swiping = false;
		this.#tracking = true;
	}

	#ontouchmove(event: TouchEvent) {
		if (!this.#tracking) return;
		if (event.touches.length > 1) {
			this.#ontouchend(true);
			return;
		}
		const touch = event.touches[0];
		if (!this.#swiping) {
			const mx = Math.abs(touch.clientX - this.#startX);
			const my = Math.abs(touch.clientY - this.#startY);
			// Decide nothing (and cancel nothing) inside the slop, so taps and scrolls stay native
			if (mx < SLOP && my < SLOP) return;
			if (mx <= my) {
				this.#tracking = false;
				return;
			}
			this.#swiping = true;
			this.#options.onintent?.(touch.clientX < this.#startX ? 1 : -1);
			// Start from here, so the content doesn't jump by the slop
			this.#startX = touch.clientX;
		}
		if (event.cancelable) event.preventDefault();
		const elapsed = event.timeStamp - this.#lastT;
		if (elapsed > 0) this.#velocity = (touch.clientX - this.#lastX) / elapsed;
		this.#lastX = touch.clientX;
		this.#lastT = event.timeStamp;
		this.#dx = touch.clientX - this.#startX;
		void this.offset.set(this.#follow(this.#dx), { duration: 0 });
	}

	#ontouchend(cancelled: boolean) {
		if (!this.#tracking) return;
		this.#tracking = false;
		if (!this.#swiping) return;
		this.#swiping = false;
		this.#suppressClickUntil = performance.now() + 500;

		const dx = this.#dx;
		const dir: Direction = dx < 0 ? 1 : -1;
		// A finger that stopped before lifting isn't flicking
		const fresh = performance.now() - this.#lastT < 100;
		const flick =
			fresh && Math.abs(this.#velocity) > FLICK && Math.sign(this.#velocity) === Math.sign(dx);
		const far = Math.abs(dx) > this.width * 0.3;
		if (!cancelled && this.#options.canGo(dir) && (far || (flick && Math.abs(dx) > 24))) {
			void this.go(dir);
		} else {
			void this.offset.set(0, {
				duration: prefersReducedMotion.current ? 120 : SETTLE_MS,
				easing: cubicOut
			});
		}
	}
}
