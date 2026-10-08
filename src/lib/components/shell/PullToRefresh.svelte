<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
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
	/** Long enough to read the indicator and the skeletons, even when reload is instant. */
	const MIN_REFRESH_MS = 600;
	const pull = new Spring(0, { stiffness: 0.2, damping: 0.7 });

	let dragging = $state(false);
	let armed = $state(false);
	let startY = 0;
	let engaged = false;

	const status = $derived(
		refreshing ? m.pull_refreshing() : armed ? m.pull_release() : m.pull_refresh()
	);

	function resistance(delta: number) {
		// Rubber-band: progressive resistance past the threshold
		const t = Math.max(0, delta);
		return Math.min(THRESHOLD * 1.6, t * 0.55);
	}

	function ontouchstart(event: TouchEvent) {
		if (refreshing || window.scrollY > 0) return;
		startY = event.touches[0]?.clientY ?? 0;
		engaged = false;
		dragging = true;
	}

	function ontouchmove(event: TouchEvent) {
		if (!dragging || refreshing) return;
		const y = event.touches[0]?.clientY ?? 0;
		const delta = y - startY;
		if (delta <= 0 && !engaged) {
			dragging = false;
			return;
		}
		if (window.scrollY > 0 && !engaged) {
			dragging = false;
			return;
		}
		if (delta > 0) {
			engaged = true;
			event.preventDefault();
			const next = resistance(delta);
			pull.set(next, { instant: prefersReducedMotion.current });
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
			pull.set(THRESHOLD * 0.7, { instant: prefersReducedMotion.current });
			const started = performance.now();
			try {
				await onrefresh();
			} finally {
				const remaining = MIN_REFRESH_MS - (performance.now() - started);
				if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
				refreshing = false;
				await pull.set(0);
			}
		} else {
			await pull.set(0);
		}
	}
</script>

<div
	role="feed"
	aria-busy={refreshing || undefined}
	class="relative"
	{ontouchstart}
	{ontouchmove}
	{ontouchend}
	ontouchcancel={ontouchend}
>
	<div
		aria-live="polite"
		aria-atomic="true"
		class="pointer-events-none fixed top-[calc(var(--adsense-top-pad,var(--safe-top))+var(--chrome-inset)+0.25rem)] left-1/2 z-30 -translate-x-1/2"
		style:opacity={pull.current > 8 || refreshing ? 1 : 0}
		style:transform="translate(-50%, {Math.min(pull.current, THRESHOLD) * 0.35}px)"
	>
		<span class="sr-only">{status}</span>
		<span class="flex size-9 items-center justify-center rounded-full glass" aria-hidden="true">
			<ArrowDownIcon
				size={18}
				weight="bold"
				class={[
					'text-ink transition-transform duration-(--dur-fast) ease-snappy',
					(armed || refreshing) && 'rotate-180',
					refreshing && 'animate-spin'
				]}
			/>
		</span>
	</div>

	<div style:transform="translateY({pull.current}px)" style:will-change="transform">
		{@render children()}
	</div>
</div>
