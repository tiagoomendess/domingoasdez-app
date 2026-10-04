<script lang="ts">
	import { untrack } from 'svelte';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import { addDays, formatDayOfMonth, formatWeekday, parseDay } from '#lib/format.ts';
	import { getLocale, m } from '#lib/messages.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';

	type Props = {
		/** Currently selected YYYY-MM-DD */
		selected: string;
		/** Lisbon "today" YYYY-MM-DD */
		today: string;
		/** Optional markers from the days API */
		markers?: Record<string, 'games' | 'live'>;
		/** Build href for a day (same as DateRail) */
		hrefFor: (day: string) => string;
		/** Called when a day is picked (parent closes the sheet) */
		onselect?: (day: string) => void;
		/** Called when the visible month changes so parent can fetch markers */
		onmonthchange?: (from: string, to: string) => void;
	};

	let {
		selected,
		today,
		markers = {},
		hrefFor,
		onselect,
		onmonthchange
	}: Props = $props();

	// Intentionally seed once from the initial `selected` prop.
	const seed = untrack(() => parseDay(selected));
	let viewYear = $state(seed.getUTCFullYear());
	let viewMonth = $state(seed.getUTCMonth());

	/** `1` = Monday … `7` = Sunday (Intl weekInfo). Defaults to Monday for pt-PT. */
	function getFirstDayOfWeek(): number {
		try {
			const locale = new Intl.Locale(getLocale());
			const info =
				'getWeekInfo' in locale && typeof locale.getWeekInfo === 'function'
					? locale.getWeekInfo()
					: (locale as Intl.Locale & { weekInfo?: { firstDay: number } }).weekInfo;
			if (info?.firstDay != null) return info.firstDay;
		} catch {
			// fall through
		}
		return 1;
	}

	function pad2(n: number) {
		return String(n).padStart(2, '0');
	}

	function toDay(year: number, month: number, date: number) {
		return `${year}-${pad2(month + 1)}-${pad2(date)}`;
	}

	/** Column index 0–6 for a UTC weekday given locale first day. */
	function columnForUtcDay(utcDay: number, firstDay: number) {
		const firstAsUtc = firstDay === 7 ? 0 : firstDay;
		return (utcDay - firstAsUtc + 7) % 7;
	}

	function notifyMonthBounds(year: number, month: number) {
		const from = toDay(year, month, 1);
		const lastDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		onmonthchange?.(from, toDay(year, month, lastDate));
	}

	/** Fire initial month bounds so the parent can fetch markers. */
	function attachMonthNotify(_node: HTMLElement) {
		notifyMonthBounds(viewYear, viewMonth);
	}

	function shiftMonth(delta: number) {
		const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
		viewYear = next.getUTCFullYear();
		viewMonth = next.getUTCMonth();
		notifyMonthBounds(viewYear, viewMonth);
	}

	const firstDayOfWeek = $derived(getFirstDayOfWeek());

	const monthTitle = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(viewYear, viewMonth, 1)))
	);

	const weekdayLabels = $derived.by(() => {
		// 2024-01-01 is a Monday — walk from the locale's first weekday.
		const monday = '2024-01-01';
		const startFromMonday = firstDayOfWeek === 7 ? 6 : firstDayOfWeek - 1;
		return Array.from({ length: 7 }, (_, i) =>
			formatWeekday(addDays(monday, (startFromMonday + i) % 7))
		);
	});

	type Cell = { key: string; day: string | null };

	const cells = $derived.by((): Cell[] => {
		const first = new Date(Date.UTC(viewYear, viewMonth, 1));
		const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
		const padStart = columnForUtcDay(first.getUTCDay(), firstDayOfWeek);
		const result: Cell[] = [];

		for (let i = 0; i < padStart; i++) {
			result.push({ key: `pad-start-${i}`, day: null });
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const day = toDay(viewYear, viewMonth, d);
			result.push({ key: day, day });
		}
		while (result.length % 7 !== 0) {
			result.push({ key: `pad-end-${result.length}`, day: null });
		}
		return result;
	});
</script>

<div class="flex flex-col gap-3" {@attach attachMonthNotify}>
	<div class="flex items-center justify-between gap-2">
		<IconButton variant="fill" label={m.date_month_prev()} onclick={() => shiftMonth(-1)}>
			<CaretLeftIcon size={18} weight="bold" />
		</IconButton>
		<h3 class="text-headline capitalize tabular-nums">{monthTitle}</h3>
		<IconButton variant="fill" label={m.date_month_next()} onclick={() => shiftMonth(1)}>
			<CaretRightIcon size={18} weight="bold" />
		</IconButton>
	</div>

	<div class="grid grid-cols-7 gap-1" role="grid" aria-label={m.date_pick()}>
		{#each weekdayLabels as label, i (i)}
			<span class="py-1 text-center text-caption text-ink-tertiary" aria-hidden="true">
				{label}
			</span>
		{/each}

		{#each cells as cell (cell.key)}
			{#if cell.day}
				{@const day = cell.day}
				{@const isSelected = day === selected}
				{@const isToday = day === today}
				{@const marker = markers[day]}
				<a
					href={hrefFor(day)}
					role="gridcell"
					aria-current={isSelected ? 'date' : undefined}
					class={[
						'pressable flex min-h-11 min-w-11 flex-col items-center justify-center rounded-full text-callout tabular-nums',
						isSelected
							? 'bg-accent text-accent-fg'
							: isToday
								? 'font-semibold text-accent-text hover:bg-fill'
								: 'text-ink hover:bg-fill'
					]}
					onclick={() => onselect?.(day)}
				>
					<span>{formatDayOfMonth(day)}</span>
					<span
						aria-hidden="true"
						class={[
							'mt-0.5 size-1 rounded-full',
							marker === 'live' ? 'bg-live' : 'bg-current opacity-45',
							!marker && 'invisible'
						]}
					></span>
				</a>
			{:else}
				<span aria-hidden="true" class="min-h-11"></span>
			{/if}
		{/each}
	</div>

	<Button variant="tinted" full href={hrefFor(today)} onclick={() => onselect?.(today)}>
		{m.date_today()}
	</Button>
</div>
