<script lang="ts">
	import { untrack } from 'svelte';
	import { navigating } from '$app/state';
	import CalendarXIcon from 'phosphor-svelte/lib/CalendarXIcon';
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
	import PaperPlaneTiltIcon from 'phosphor-svelte/lib/PaperPlaneTiltIcon';
	import DateRail from '#lib/components/games/DateRail.svelte';
	import MatchGroup from '#lib/components/games/MatchGroup.svelte';
	import MonthPicker from '#lib/components/games/MonthPicker.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import Skeleton from '#lib/components/ui/Skeleton.svelte';
	import type { Match } from '#lib/components/types.ts';
	import { addDays, formatDayMonth } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	/** Legacy /direto polled every 5s; keep that cadence while Today is visible. */
	const LIVE_POLL_MS = 5_000;

	type DayGroup = PageProps['data']['live'][number];

	let { data }: PageProps = $props();

	// Seed once from the first load; later syncs happen in $effect / rail extenders.
	let railDays = $state.raw(untrack(() => [...data.days]));
	let railMarkers = $state.raw(untrack(() => ({ ...data.markers })));
	let live = $state.raw<DayGroup[]>(untrack(() => data.live));
	let groups = $state.raw<DayGroup[]>(untrack(() => data.groups));
	let sheetOpen = $state(false);
	let liveMatchSheetOpen = $state(false);
	let liveMatch = $state.raw<Match | null>(null);
	let pageVisible = $state(
		typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
	);

	let seededFor = untrack(() => data.selected);
	let loadingStart = false;
	let loadingEnd = false;

	// Apply the new day window before paint, so the rail centers the selection
	// in its final layout instead of a list that is about to be replaced.
	$effect.pre(() => {
		const selected = data.selected;
		if (selected === seededFor) return;
		seededFor = selected;
		railDays = [...data.days];
		live = data.live;
		groups = data.groups;
	});

	$effect(() => {
		const serverMarkers = data.markers;
		railMarkers = { ...untrack(() => railMarkers), ...serverMarkers };
	});

	// Poll scores while viewing Today (replaces slow invalidate-only refresh).
	$effect(() => {
		if (data.selected !== data.today || !pageVisible) return;

		const day = data.today;
		let cancelled = false;

		async function tick() {
			try {
				const res = await fetch(`/api/jogos/dia?date=${encodeURIComponent(day)}`, {
					cache: 'no-store'
				});
				if (!res.ok || cancelled) return;
				const body = (await res.json()) as { live?: DayGroup[]; groups?: DayGroup[] };
				if (cancelled) return;
				if (body.live) live = body.live;
				if (body.groups) groups = body.groups;

				const hasLive = (body.live?.length ?? 0) > 0;
				const prev = untrack(() => railMarkers);
				if (hasLive) {
					railMarkers = { ...prev, [day]: 'live' };
				} else if (prev[day] === 'live') {
					railMarkers = { ...prev, [day]: 'games' };
				}
			} catch {
				// Keep last good snapshot; next tick retries.
			}
		}

		void tick();
		const id = setInterval(tick, LIVE_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	});

	const loading = $derived(!!navigating.to && navigating.to.url.pathname === '/jogos');

	const liveCount = $derived(live.reduce((sum, group) => sum + group.matches.length, 0));
	const isEmpty = $derived(live.length === 0 && groups.length === 0);

	function hrefFor(day: string) {
		return day === data.today ? '/jogos' : `/jogos?date=${day}`;
	}

	function openLiveMatchSheet(match: Match) {
		liveMatch = match;
		liveMatchSheetOpen = true;
	}

	const liveScoreReportHref = $derived(
		liveMatch
			? `/score-reports/${liveMatch.id}?returnTo=${encodeURIComponent(hrefFor(data.selected))}`
			: null
	);

	function onvisibilitychange() {
		pageVisible = document.visibilityState === 'visible';
	}

	async function fetchMarkers(from: string, to: string) {
		try {
			const res = await fetch(
				`/api/jogos/dias?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
			);
			if (!res.ok) return {} as Record<string, 'games' | 'live'>;
			const body = (await res.json()) as { markers?: Record<string, 'games' | 'live'> };
			return body.markers ?? {};
		} catch {
			return {} as Record<string, 'games' | 'live'>;
		}
	}

	async function extendStart() {
		if (loadingStart) return;
		const first = railDays[0];
		if (!first) return;

		loadingStart = true;
		try {
			const from = addDays(first, -14);
			const to = addDays(first, -1);
			const extra = Array.from({ length: 14 }, (_, i) => addDays(from, i));
			const markers = await fetchMarkers(from, to);
			railDays = [...extra, ...railDays];
			railMarkers = { ...railMarkers, ...markers };
		} finally {
			loadingStart = false;
		}
	}

	async function extendEnd() {
		if (loadingEnd) return;
		const last = railDays[railDays.length - 1];
		if (!last) return;

		loadingEnd = true;
		try {
			const from = addDays(last, 1);
			const to = addDays(last, 14);
			const extra = Array.from({ length: 14 }, (_, i) => addDays(from, i));
			const markers = await fetchMarkers(from, to);
			railDays = [...railDays, ...extra];
			railMarkers = { ...railMarkers, ...markers };
		} finally {
			loadingEnd = false;
		}
	}

	async function onmonthchange(from: string, to: string) {
		const markers = await fetchMarkers(from, to);
		railMarkers = { ...railMarkers, ...markers };
	}
</script>

<svelte:head>
	<title>{m.nav_games()} · {m.feed_brand()}</title>
	<meta name="description" content={m.games_meta_description()} />
</svelte:head>

<svelte:document {onvisibilitychange} />

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.nav_games()}</h1>
</header>

<div class="mb-4">
	<DateRail
		days={railDays}
		selected={data.selected}
		today={data.today}
		markers={railMarkers}
		{hrefFor}
		oncalendar={() => (sheetOpen = true)}
		onnearstart={extendStart}
		onnearend={extendEnd}
	/>
</div>

<Sheet bind:open={sheetOpen} title={m.date_pick()}>
	<MonthPicker
		selected={data.selected}
		today={data.today}
		markers={railMarkers}
		{hrefFor}
		onselect={() => (sheetOpen = false)}
		{onmonthchange}
	/>
</Sheet>

<Sheet bind:open={liveMatchSheetOpen} title={m.games_live_match_options()}>
	{#if liveMatch && liveScoreReportHref}
		<ListGroup>
			<ListRow title={m.games_live_send_score()} href={liveScoreReportHref}>
				{#snippet leading()}
					<span class="text-ink-secondary">
						<PaperPlaneTiltIcon size={22} weight="regular" />
					</span>
				{/snippet}
			</ListRow>
			<ListRow title={m.games_live_match_details()} href={liveMatch.href}>
				{#snippet leading()}
					<span class="text-ink-secondary">
						<InfoIcon size={22} weight="regular" />
					</span>
				{/snippet}
			</ListRow>
		</ListGroup>
	{/if}
</Sheet>

{#if loading}
	<div class="space-y-3" aria-busy="true">
		{#each [1, 2, 3] as block (block)}
			<div class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
				<div class="flex items-center gap-3 px-4 py-3">
					<Skeleton class="size-8" />
					<div class="flex-1 space-y-1.5">
						<Skeleton class="h-4 w-2/3" />
						<Skeleton class="h-3 w-1/3" />
					</div>
				</div>
				{#each [1, 2] as row (row)}
					<div class="flex items-center gap-3 border-t border-line px-4 py-3">
						<Skeleton class="h-4 w-12" />
						<div class="flex-1 space-y-2">
							<Skeleton class="h-4 w-4/5" />
							<Skeleton class="h-4 w-3/5" />
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
{:else}
	<div class="space-y-3">
		{#if data.today === data.selected && live.length > 0}
			<section class="space-y-3">
				<SectionHeader title={m.games_live_title()} live count={liveCount} headingLevel={3} />
				{#each live as group (group.id)}
					<MatchGroup
						name={group.name}
						subtitle={group.subtitle}
						emblem={group.emblem}
						href={group.href}
						matches={group.matches}
						onliveclick={openLiveMatchSheet}
					/>
				{/each}
			</section>
		{/if}

		{#if groups.length > 0}
			<section class="space-y-3">
				<SectionHeader
					title={data.today === data.selected && live.length > 0
						? m.games_other_today()
						: m.games_day_title()}
					headingLevel={3}
				/>
				<div class="lg:columns-2 lg:gap-3">
					{#each groups as group (group.id)}
						<div class="mb-3 break-inside-avoid last:mb-0 lg:mb-3">
							<MatchGroup
								name={group.name}
								subtitle={group.subtitle}
								emblem={group.emblem}
								href={group.href}
								matches={group.matches}
							/>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if isEmpty}
			<EmptyState
				icon={CalendarXIcon}
				title={m.games_empty_title()}
				description={m.games_empty_text()}
			>
				{#snippet action()}
					{#if data.nextGameDay}
						<Button variant="tinted" href={hrefFor(data.nextGameDay)}>
							{m.games_next_game({ date: formatDayMonth(data.nextGameDay) })}
						</Button>
					{:else}
						<Button variant="tinted" href="/jogos">{m.games_back_to_today()}</Button>
					{/if}
				{/snippet}
			</EmptyState>
		{/if}
	</div>
{/if}
