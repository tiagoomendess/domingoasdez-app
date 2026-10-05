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
	let centeredDay: string | undefined;
	let prevDays: readonly string[] | undefined;
	let prevFirst: string | undefined;
	let prevLength = 0;
	let prevFirstOffset = 0;

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
		const nextDays = days;
		const day = selected;
		const extended = prevDays !== undefined && isDayListExtension(prevDays, nextDays);
		prevDays = nextDays;

		preserveScrollOnPrepend(rail);

		const row = rail.closest('nav') ?? rail;
		const rowRect = row.getBoundingClientRect();
		const railRect = rail.getBoundingClientRect();
		// The calendar button sits on the right. Inset the snap area by that
		// width so a snapped day lands on the center of the screen, not the rail.
		const buttonSpace = Math.max(0, Math.round(rowRect.right - railRect.right));
		const snapPadding = `${buttonSpace}px`;
		if (rail.style.scrollPaddingLeft !== snapPadding) {
			rail.style.scrollPaddingLeft = snapPadding;
		}

		if (extended && centeredDay === day) return;

		const pill = rail.querySelector<HTMLElement>(`[data-day="${day}"]`);
		if (!pill) return;

		const pillRect = pill.getBoundingClientRect();
		const delta = pillRect.left + pillRect.width / 2 - (rowRect.left + rowRect.width / 2);
		const onScreen = pillRect.right > railRect.left && pillRect.left < railRect.right;
		if (Math.abs(delta) >= 1) {
			rail.scrollBy({
				left: delta,
				behavior: centered && onScreen && !prefersReducedMotion.current ? 'smooth' : 'instant'
			});
		}
		centered = true;
		centeredDay = day;
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
