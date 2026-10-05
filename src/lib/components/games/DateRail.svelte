<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import CalendarBlankIcon from 'phosphor-svelte/lib/CalendarBlankIcon';
	import { formatDayOfMonth, formatWeekday } from '#lib/format.ts';
	import { isDayListExtension } from '#lib/games.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		/** `YYYY-MM-DD` days, oldest first */
		days: string[];
		selected: string;
		today: string;
		markers?: Record<string, 'games' | 'live'>;
		hrefFor: (day: string) => string;
		onselect?: (day: string, event: MouseEvent) => void;
		oncalendar?: () => void;
		/** Fired when the user scrolls near the start (left) of the rail */
		onnearstart?: () => void;
		/** Fired when the user scrolls near the end (right) of the rail */
		onnearend?: () => void;
	};

	let {
		days,
		selected,
		today,
		markers = {},
		hrefFor,
		onselect,
		oncalendar,
		onnearstart,
		onnearend
	}: Props = $props();

	let centered = false;
	let placedFor: string | undefined;
	let userScrolled = false;
	let currentDay = '';
	let settleFrame = 0;
	let scrollFrame = 0;
	let scrolling = false;
	let prevDays: readonly string[] | undefined;
	let prevFirst: string | undefined;
	let prevLength = 0;
	let prevFirstOffset = 0;

	/** Sample `cubic-bezier(x1, y1, x2, y2)` from a CSS timing function. */
	function bezierEasing(easing: string): (t: number) => number {
		const match = easing.match(
			/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
		);
		if (!match) return (t) => t;
		const x1 = Number(match[1]);
		const y1 = Number(match[2]);
		const x2 = Number(match[3]);
		const y2 = Number(match[4]);
		const cx = 3 * x1;
		const bx = 3 * (x2 - x1) - cx;
		const ax = 1 - cx - bx;
		const cy = 3 * y1;
		const by = 3 * (y2 - y1) - cy;
		const ay = 1 - cy - by;
		const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
		const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
		const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
		return (x: number) => {
			if (x <= 0) return 0;
			if (x >= 1) return 1;
			let t = x;
			for (let i = 0; i < 6; i++) {
				const slope = sampleDX(t);
				if (slope === 0) break;
				const next = t - (sampleX(t) - x) / slope;
				if (Math.abs(next - t) < 1e-5) {
					t = next;
					break;
				}
				t = next;
			}
			return sampleY(Math.min(1, Math.max(0, t)));
		};
	}

	/**
	 * Distance from the selected pill's center to the center of the row.
	 * Null until the rail has been laid out — a zero rect is not "already centered".
	 */
	function centerDelta(rail: HTMLElement, day: string): number | null {
		const pill = rail.querySelector<HTMLElement>(`[data-day="${day}"]`);
		if (!pill || rail.clientWidth === 0 || pill.clientWidth === 0) return null;

		const row = rail.closest('nav') ?? rail;
		const rowRect = row.getBoundingClientRect();
		const railRect = rail.getBoundingClientRect();
		const buttonSpace = Math.max(0, Math.round(rowRect.right - railRect.right));
		const snapPadding = `${buttonSpace}px`;
		if (rail.style.scrollPaddingLeft !== snapPadding) {
			rail.style.scrollPaddingLeft = snapPadding;
		}

		const pillRect = pill.getBoundingClientRect();
		return pillRect.left + pillRect.width / 2 - (rowRect.left + rowRect.width / 2);
	}

	function stopScrollAnimation(rail: HTMLElement) {
		cancelAnimationFrame(scrollFrame);
		scrolling = false;
		rail.style.scrollSnapType = '';
	}

	/** Slide scrollLeft. Native smooth-scroll fights scroll-snap and reads as a flicker. */
	function animateScroll(rail: HTMLElement, target: number) {
		cancelAnimationFrame(scrollFrame);
		const start = rail.scrollLeft;
		const delta = target - start;
		if (Math.abs(delta) < 1 || prefersReducedMotion.current) {
			rail.scrollLeft = target;
			stopScrollAnimation(rail);
			return;
		}

		const rootStyle = getComputedStyle(document.documentElement);
		const duration = Number.parseFloat(rootStyle.getPropertyValue('--dur-base')) || 240;
		const ease = bezierEasing(rootStyle.getPropertyValue('--ease-fluid'));
		rail.style.scrollSnapType = 'none';
		scrolling = true;
		const started = performance.now();

		const step = (now: number) => {
			if (userScrolled) {
				stopScrollAnimation(rail);
				return;
			}
			const t = Math.min(1, (now - started) / duration);
			rail.scrollLeft = start + delta * ease(t);
			if (t < 1) {
				scrollFrame = requestAnimationFrame(step);
				return;
			}
			rail.scrollLeft = target;
			stopScrollAnimation(rail);
		};
		scrollFrame = requestAnimationFrame(step);
	}

	function placeSelected(rail: HTMLElement, day: string, behavior: 'instant' | 'slide'): boolean {
		const delta = centerDelta(rail, day);
		if (delta == null) return false;
		if (Math.abs(delta) < 1) return true;
		if (behavior === 'slide') {
			animateScroll(rail, rail.scrollLeft + delta);
			return true;
		}
		stopScrollAnimation(rail);
		rail.scrollBy({ left: delta, behavior: 'instant' });
		return false;
	}

	/** Keep the visible window stable when the parent prepends older days. */
	function preserveScrollOnPrepend(rail: HTMLElement) {
		const first = days[0];
		const length = days.length;

		if (
			prevFirst !== undefined &&
			first !== undefined &&
			first < prevFirst &&
			length > prevLength
		) {
			const oldFirstEl = rail.querySelector<HTMLElement>(`[data-day="${prevFirst}"]`);
			if (oldFirstEl) {
				const delta = oldFirstEl.offsetLeft - prevFirstOffset;
				if (delta > 0) {
					rail.scrollTo({ left: rail.scrollLeft + delta, behavior: 'instant' });
				}
			}
		}

		prevFirst = first;
		prevLength = length;
		const firstEl = first ? rail.querySelector<HTMLElement>(`[data-day="${first}"]`) : null;
		prevFirstOffset = firstEl?.offsetLeft ?? 0;
	}

	/**
	 * Put the selected day in the middle of the row. Re-run after the day list
	 * is rebuilt around a new selection; leave the scroll position alone when
	 * the user is only loading more days at either end.
	 */
	function syncSelectedScroll(rail: HTMLElement) {
		const noteUser = () => {
			userScrolled = true;
		};
		rail.addEventListener('pointerdown', noteUser);
		rail.addEventListener('wheel', noteUser, { passive: true });
		const resize = new ResizeObserver(() => {
			if (scrolling || userScrolled || !currentDay || placedFor !== currentDay) return;
			placeSelected(rail, currentDay, 'instant');
		});
		resize.observe(rail);

		const nextDays = days;
		const day = selected;
		currentDay = day;
		const extended = prevDays !== undefined && isDayListExtension(prevDays, nextDays);
		const selectionChanged = placedFor !== undefined && placedFor !== day;
		if (selectionChanged) userScrolled = false;
		prevDays = nextDays;

		preserveScrollOnPrepend(rail);

		const release = () => {
			cancelAnimationFrame(settleFrame);
			cancelAnimationFrame(scrollFrame);
			scrolling = false;
			rail.style.scrollSnapType = '';
			rail.removeEventListener('pointerdown', noteUser);
			rail.removeEventListener('wheel', noteUser);
			resize.disconnect();
		};

		if (placedFor === day && extended && userScrolled) return release;

		const pill = rail.querySelector<HTMLElement>(`[data-day="${day}"]`);
		const railRect = rail.getBoundingClientRect();
		const pillRect = pill?.getBoundingClientRect();
		const onScreen =
			!!pillRect && pillRect.right > railRect.left && pillRect.left < railRect.right;
		const behavior = centered && onScreen && !prefersReducedMotion.current ? 'slide' : 'instant';

		cancelAnimationFrame(settleFrame);
		let attempts = 0;
		const settle = () => {
			if (userScrolled && placedFor === day) return;
			const done = placeSelected(rail, day, attempts === 0 ? behavior : 'instant');
			attempts += 1;
			// First paint can report a zero-size rail. Keep trying until it has a box.
			// Don't interrupt a smooth scroll that already started for a day change.
			if (!done && behavior === 'instant' && attempts < 8) {
				settleFrame = requestAnimationFrame(settle);
				return;
			}
			if (done || behavior === 'slide') {
				centered = true;
				placedFor = day;
			}
		};
		settle();

		return release;
	}

	/** Observe a 1px sentinel; fire once per enter (ignore while already intersecting). */
	function observeNear(callback: (() => void) | undefined) {
		return (sentinel: HTMLElement) => {
			if (!callback) return;

			const root = sentinel.parentElement;
			if (!root) return;

			let intersecting = false;
			let coolingDown = false;

			const io = new IntersectionObserver(
				(entries) => {
					const entry = entries[0];
					if (!entry) return;

					if (entry.isIntersecting) {
						if (intersecting || coolingDown) return;
						intersecting = true;
						coolingDown = true;
						callback();
						setTimeout(() => {
							coolingDown = false;
						}, 400);
					} else {
						intersecting = false;
					}
				},
				{ root, rootMargin: '0px 40px' }
			);

			io.observe(sentinel);
			return () => io.disconnect();
		};
	}
</script>

<nav aria-label={m.date_rail_label()} class="-mx-4 flex items-center">
	<div class="relative rail min-w-0 flex-1 px-4 py-1" {@attach syncSelectedScroll}>
		<span aria-hidden="true" class="w-px shrink-0" {@attach observeNear(onnearstart)}></span>
		{#each days as day (day)}
			{@const isSelected = day === selected}
			{@const isToday = day === today}
			{@const marker = markers[day]}
			<a
				href={hrefFor(day)}
				data-day={day}
				aria-current={isSelected ? 'date' : undefined}
				class={[
					'flex h-15 w-13 shrink-0 pressable snap-center flex-col items-center justify-center rounded-full',
					isSelected ? 'bg-accent text-accent-fg' : 'bg-fill text-ink hover:bg-fill-strong'
				]}
				onclick={(event) => onselect?.(day, event)}
			>
				<span
					class={[
						'text-caption',
						isSelected
							? 'text-accent-fg/85'
							: isToday
								? 'font-semibold text-accent-text'
								: 'text-ink-tertiary'
					]}
				>
					{isToday ? m.date_today() : formatWeekday(day)}
				</span>
				<span class="text-headline tabular-nums">{formatDayOfMonth(day)}</span>
				<span
					aria-hidden="true"
					class={[
						'mt-0.5 size-1 rounded-full',
						marker === 'live' ? 'bg-live' : 'bg-current opacity-45',
						!marker && 'invisible'
					]}
				></span>
			</a>
		{/each}
		<span aria-hidden="true" class="w-px shrink-0" {@attach observeNear(onnearend)}></span>
	</div>
	{#if oncalendar}
		<button
			type="button"
			aria-label={m.date_pick()}
			class="mr-4 grid h-15 w-11 shrink-0 pressable place-items-center rounded-full bg-fill text-ink hover:bg-fill-strong"
			onclick={oncalendar}
		>
			<CalendarBlankIcon size={20} weight="bold" />
		</button>
	{/if}
</nav>
