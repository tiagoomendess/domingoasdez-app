<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicIn, cubicOut, quintOut } from 'svelte/easing';
	import RoundNavigator from './RoundNavigator.svelte';

	type Props = {
		label: string;
		hasPrev: boolean;
		hasNext: boolean;
		onprev: () => void;
		onnext: () => void;
		children: Snippet;
	};

	let { label, hasPrev, hasNext, onprev, onnext, children }: Props = $props();

	/** Travel before a touch counts as a swipe or a scroll; below it, it's a tap. */
	const SLOP = 10;
	/** How far past the first or last round the content stretches. */
	const RUBBER = 64;
	/** px/ms: a quick flick changes round even when it's short. */
	const FLICK = 0.4;

	const offset = new Tween(0);
	const opacity = new Tween(1);

	let width = $state(0);
	// Plain, not $state: a touch that hasn't become a swipe must not change the DOM
	// (iOS Safari drops a scroll that's already started if a layer around it changes).
	let busy = false;
	let tracking = false;
	let swiping = false;
	let startX = 0;
	let startY = 0;
	let dx = 0;
	let lastX = 0;
	let lastT = 0;
	let velocity = 0;
	let suppressClickUntil = 0;

	/** 1 = next round (swipe left), -1 = previous (swipe right). */
	type Direction = 1 | -1;

	function blocked(dir: Direction) {
		return dir === 1 ? !hasNext : !hasPrev;
	}

	function follow(delta: number) {
		const dir: Direction = delta < 0 ? 1 : -1;
		if (!blocked(dir)) return delta;
		// Rubber-band at the first/last round
		const t = Math.abs(delta);
		return Math.sign(delta) * (1 - 1 / ((t * 0.55) / RUBBER + 1)) * RUBBER;
	}

	/** Slides the current round out, swaps it, and slides the new one in. The buttons use it too. */
	async function go(dir: Direction) {
		if (busy || blocked(dir)) return;
		busy = true;
		const advance = dir === 1 ? onnext : onprev;
		if (prefersReducedMotion.current || !width) {
			await opacity.set(0, { duration: 75 });
			await offset.set(0, { duration: 0 });
			advance();
			await tick();
			await opacity.set(1, { duration: 75 });
		} else {
			const remaining = width - Math.abs(offset.current);
			await offset.set(-dir * width, {
				duration: Math.max(80, (180 * remaining) / width),
				easing: cubicIn
			});
			advance();
			await tick();
			await offset.set(dir * width, { duration: 0 });
			await offset.set(0, { duration: 280, easing: quintOut });
		}
		busy = false;
	}

	function settle() {
		void offset.set(0, { duration: prefersReducedMotion.current ? 120 : 220, easing: cubicOut });
	}

	/** A table wider than the card scrolls sideways itself, so a swipe there isn't ours. */
	function scrollsSideways(target: EventTarget | null, root: HTMLElement) {
		for (
			let el = target instanceof Element ? target : null;
			el && el !== root;
			el = el.parentElement
		) {
			if (el.scrollWidth <= el.clientWidth + 1) continue;
			const { overflowX } = getComputedStyle(el);
			if (overflowX === 'auto' || overflowX === 'scroll') return true;
		}
		return false;
	}

	function ontouchstart(event: TouchEvent, root: HTMLElement) {
		tracking = false;
		if (busy || event.touches.length !== 1 || scrollsSideways(event.target, root)) return;
		const touch = event.touches[0];
		startX = lastX = touch.clientX;
		startY = touch.clientY;
		lastT = event.timeStamp;
		dx = 0;
		velocity = 0;
		swiping = false;
		tracking = true;
	}

	function ontouchmove(event: TouchEvent) {
		if (!tracking) return;
		if (event.touches.length > 1) {
			ontouchend(true);
			return;
		}
		const touch = event.touches[0];
		if (!swiping) {
			const mx = Math.abs(touch.clientX - startX);
			const my = Math.abs(touch.clientY - startY);
			// Decide nothing (and cancel nothing) inside the slop, so taps and scrolls stay native
			if (mx < SLOP && my < SLOP) return;
			if (mx <= my) {
				tracking = false;
				return;
			}
			swiping = true;
			// Start from here, so the content doesn't jump by the slop
			startX = touch.clientX;
		}
		if (event.cancelable) event.preventDefault();
		const elapsed = event.timeStamp - lastT;
		if (elapsed > 0) velocity = (touch.clientX - lastX) / elapsed;
		lastX = touch.clientX;
		lastT = event.timeStamp;
		dx = touch.clientX - startX;
		void offset.set(follow(dx), { duration: 0 });
	}

	function ontouchend(cancelled = false) {
		if (!tracking) return;
		tracking = false;
		if (!swiping) return;
		swiping = false;
		// The finger lifting at the end of a swipe must not open the game under it
		suppressClickUntil = performance.now() + 500;

		const dir: Direction = dx < 0 ? 1 : -1;
		// A finger that stopped before lifting isn't flicking
		const fresh = performance.now() - lastT < 100;
		const flick = fresh && Math.abs(velocity) > FLICK && Math.sign(velocity) === Math.sign(dx);
		const far = Math.abs(dx) > width * 0.3;
		if (!cancelled && !blocked(dir) && (far || (flick && Math.abs(dx) > 24))) void go(dir);
		else settle();
	}

	/** touchmove must not be passive, so a swipe can stop the page from scrolling under it. */
	function gestures(node: HTMLElement) {
		const start = (event: TouchEvent) => ontouchstart(event, node);
		const end = () => ontouchend();
		const cancel = () => ontouchend(true);
		const click = (event: MouseEvent) => {
			if (performance.now() >= suppressClickUntil) return;
			event.preventDefault();
			event.stopPropagation();
		};
		node.addEventListener('touchstart', start, { passive: true });
		node.addEventListener('touchmove', ontouchmove, { passive: false });
		node.addEventListener('touchend', end);
		node.addEventListener('touchcancel', cancel);
		node.addEventListener('click', click, { capture: true });
		return () => {
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchmove', ontouchmove);
			node.removeEventListener('touchend', end);
			node.removeEventListener('touchcancel', cancel);
			node.removeEventListener('click', click, { capture: true });
		};
	}
</script>

<div {@attach gestures}>
	<RoundNavigator {label} {hasPrev} {hasNext} onprev={() => go(-1)} onnext={() => go(1)} />
	<!-- No transform at rest: the content only moves while a swipe or a round change runs -->
	<div
		bind:clientWidth={width}
		style:transform={offset.current !== 0 ? `translateX(${offset.current}px)` : undefined}
		style:opacity={opacity.current !== 1 ? opacity.current : undefined}
	>
		{@render children()}
	</div>
</div>
