<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import { scale } from 'svelte/transition';
	import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon';
	import { m } from '#lib/messages.ts';

	type Props = {
		onrefresh: () => Promise<void>;
		/** True while the indicator is held up, including the minimum visible time. */
		refreshing?: boolean;
		children: Snippet;
	};

	let { onrefresh, refreshing = $bindable(false), children }: Props = $props();

	const THRESHOLD = 72;
	/** Travel before a touch counts as a pull or a sideways swipe. */
	const SLOP = 10;
	/** Long enough to read the indicator and the skeletons, even when reload is instant. */
	const MIN_REFRESH_MS = 600;
	const pull = new Spring(0, { stiffness: 0.2, damping: 0.7 });

	/**
	 * Plain, not $state: a touch that hasn't become a pull must not change the DOM. iOS Safari
	 * drops a scroll gesture that's already started (the date rail, a feed carousel) if a layer
	 * around it is promoted or demoted mid-touch, as toggling `will-change` here once did.
	 */
	let dragging = false;
	/** Keeps the spinner while the indicator springs back, so the arrow doesn't flash on the way out. */
	let settling = $state(false);
	let armed = $state(false);
	let startX = 0;
	let startY = 0;
	let engaged = false;

	const status = $derived(
		refreshing ? m.pull_refreshing() : armed ? m.pull_release() : m.pull_refresh()
	);

	/** Each set aborts the one before it (every touchmove does); that rejection is expected. */
	function move(target: number, instant = false) {
		return pull.set(target, { instant }).catch(() => {});
	}

	function resistance(delta: number) {
		// Rubber-band: progressive resistance past the threshold
		const t = Math.max(0, delta);
		return Math.min(THRESHOLD * 1.6, t * 0.55);
	}

	/** Touches that belong to something else: sheets and popovers (drag-to-dismiss, their own scroll), pinch-zoom. */
	function ignored(event: TouchEvent) {
		if (event.touches.length > 1) return true;
		if ((window.visualViewport?.scale ?? 1) > 1) return true;
		const target = event.target instanceof Element ? event.target : null;
		return Boolean(target?.closest('dialog, [popover]'));
	}

	function ontouchstart(event: TouchEvent) {
		if (refreshing || window.scrollY > 0 || ignored(event)) return;
		startX = event.touches[0]?.clientX ?? 0;
		startY = event.touches[0]?.clientY ?? 0;
		engaged = false;
		dragging = true;
	}

	function ontouchmove(event: TouchEvent) {
		if (!dragging || refreshing) return;
		// A second finger mid-pull turns it into a pinch
		if (event.touches.length > 1) {
			void ontouchend();
			return;
		}
		const x = event.touches[0]?.clientX ?? 0;
		const y = event.touches[0]?.clientY ?? 0;
		const delta = y - startY;
		if (!engaged) {
			const dx = Math.abs(x - startX);
			// Decide nothing (and cancel nothing) inside the slop. iOS Safari locks the whole
			// gesture on the first touchmove it sees, at ~1px of travel: preventing that one
			// because a sideways swipe drifted down a pixel kills the rail/carousel scroll.
			if (dx < SLOP && Math.abs(delta) < SLOP) return;
			// A sideways swipe (the date rail, a feed carousel) is not a pull, even if it drifts down
			if (dx > Math.abs(delta) || delta <= 0 || window.scrollY > 0) {
				dragging = false;
				return;
			}
		}
		if (delta > 0) {
			engaged = true;
			if (event.cancelable) event.preventDefault();
			const next = resistance(delta - SLOP);
			void move(next, prefersReducedMotion.current);
			if (next >= THRESHOLD && !armed) {
				armed = true;
				navigator.vibrate?.(10);
			} else if (next < THRESHOLD && armed) {
				armed = false;
			}
		}
	}

	async function ontouchend() {
		if (!dragging) return;
		dragging = false;
		if (!engaged) {
			armed = false;
			return;
		}
		engaged = false;

		if (armed) {
			armed = false;
			refreshing = true;
			void move(THRESHOLD * 0.7, prefersReducedMotion.current);
			const started = performance.now();
			try {
				await onrefresh();
			} finally {
				const remaining = MIN_REFRESH_MS - (performance.now() - started);
				if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
				refreshing = false;
				settling = true;
				await move(0);
				settling = false;
			}
		} else {
			await move(0);
		}
	}

	/** touchmove must not be passive, or preventDefault() can't stop the page from moving. */
	function gestures(node: HTMLElement) {
		const end = () => void ontouchend();
		node.addEventListener('touchstart', ontouchstart, { passive: true });
		node.addEventListener('touchmove', ontouchmove, { passive: false });
		node.addEventListener('touchend', end);
		node.addEventListener('touchcancel', end);
		return () => {
			node.removeEventListener('touchstart', ontouchstart);
			node.removeEventListener('touchmove', ontouchmove);
			node.removeEventListener('touchend', end);
			node.removeEventListener('touchcancel', end);
		};
	}
</script>

<div aria-busy={refreshing || undefined} class="relative" {@attach gestures}>
	<div
		aria-live="polite"
		aria-atomic="true"
		class="pointer-events-none fixed top-[calc(var(--chrome-top)+0.25rem)] left-1/2 z-30 -translate-x-1/2"
		style:opacity={pull.current > 8 || refreshing ? 1 : 0}
		style:transform="translate(-50%, {Math.min(pull.current, THRESHOLD) * 0.35}px)"
	>
		<span class="sr-only">{status}</span>
		<span class="flex size-9 items-center justify-center rounded-full glass" aria-hidden="true">
			{#if refreshing || settling}
				<span
					in:scale={{ start: 0.6, duration: prefersReducedMotion.current ? 0 : 160 }}
					class="size-4.5 animate-spin rounded-full border-2 border-accent border-r-transparent motion-reduce:[animation-duration:1.6s]"
				></span>
			{:else}
				<ArrowDownIcon
					size={18}
					weight="bold"
					class={[
						'text-ink transition-transform duration-(--dur-fast) ease-snappy',
						armed && 'rotate-180'
					]}
				/>
			{/if}
		</span>
	</div>

	<!-- No transform at rest: it would become the containing block of any fixed element in the page -->
	<div
		style:transform={pull.current > 0.5 ? `translateY(${pull.current}px)` : undefined}
		style:will-change={pull.current > 0.5 || refreshing ? 'transform' : undefined}
	>
		{@render children()}
	</div>
</div>
