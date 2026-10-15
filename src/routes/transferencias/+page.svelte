<script lang="ts">
	import { untrack } from 'svelte';
	import { navigating } from '$app/state';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import AdSenseUnit from '#lib/components/ads/AdSenseUnit.svelte';
	import DateRail from '#lib/components/games/DateRail.svelte';
	import MonthPicker from '#lib/components/games/MonthPicker.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import Skeleton from '#lib/components/ui/Skeleton.svelte';
	import { adSlots } from '#lib/ads.ts';
	import { addDays, formatDayMonth } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { transfersHref } from '#lib/transfers.ts';
	import type { PageProps } from './$types';

	type Markers = Record<string, 'transfers'>;

	let { data }: PageProps = $props();

	// Seed once from the first load; later syncs happen in $effect / rail extenders.
	let railDays = $state.raw(untrack(() => [...data.days]));
	let railMarkers = $state.raw<Markers>(untrack(() => ({ ...data.markers })));
	let sheetOpen = $state(false);

	let seededFor = untrack(() => data.selected);
	let loadingStart = false;
	let loadingEnd = false;

	// Keep the days already on screen so a tap slides the rail instead of
	// swapping the row out. A far jump (calendar) still adopts the new window.
	$effect.pre(() => {
		const selected = data.selected;
		if (selected === seededFor) return;
		seededFor = selected;
		const current = untrack(() => railDays);
		if (!current.includes(selected)) railDays = [...data.days];
	});

	$effect(() => {
		const serverMarkers = data.markers;
		railMarkers = { ...untrack(() => railMarkers), ...serverMarkers };
	});

	const loading = $derived(!!navigating.to && navigating.to.url.pathname === '/transferencias');

	async function fetchMarkers(from: string, to: string): Promise<Markers> {
		try {
			const res = await fetch(
				`/api/transferencias/dias?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
			);
			if (!res.ok) return {};
			const body = (await res.json()) as { markers?: Markers };
			return body.markers ?? {};
		} catch {
			return {};
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

{#snippet previousDayAction()}
	{#if data.previousDay}
		<Button variant="tinted" href={transfersHref(data.previousDay)}>
			{m.transfers_previous_day({ date: formatDayMonth(data.previousDay) })}
		</Button>
	{/if}
{/snippet}

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{data.seo.title}</h1>
</header>

<div class="mb-4">
	<DateRail
		days={railDays}
		selected={data.selected}
		today={data.today}
		markers={railMarkers}
		hrefFor={transfersHref}
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
		hrefFor={transfersHref}
		onselect={() => (sheetOpen = false)}
		{onmonthchange}
	/>
</Sheet>

{#if loading}
	<div
		class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0"
		aria-busy="true"
	>
		{#each [1, 2, 3, 4, 5] as row (row)}
			<div class="flex items-center gap-3 px-4 py-3 not-first:border-t not-first:border-line">
				<Skeleton class="size-10 rounded-full" />
				<div class="flex-1 space-y-1.5">
					<Skeleton class="h-4 w-1/2" />
					<Skeleton class="h-3 w-4/5" />
				</div>
			</div>
		{/each}
	</div>
{:else if data.transfers.length === 0}
	<EmptyState
		icon={ArrowsLeftRightIcon}
		title={m.transfers_empty_title()}
		description={m.transfers_empty_text()}
		action={data.previousDay ? previousDayAction : undefined}
	/>
{:else}
	<ListGroup>
		{#each data.transfers as transfer (transfer.id)}
			<ListRow
				title={transfer.playerName}
				subtitle={`${transfer.fromLabel} → ${transfer.toLabel}`}
				href={transfer.href ?? undefined}
			>
				{#snippet leading()}
					<Avatar name={transfer.playerName} src={transfer.picture} size={40} />
				{/snippet}
				{#snippet trailing()}
					<Emblem
						name={transfer.toLabel}
						src={transfer.toEmblem}
						size={24}
						plate={false}
						decorative
					/>
				{/snippet}
			</ListRow>
		{/each}
	</ListGroup>
{/if}

<div class="mt-4">
	<AdSenseUnit adSlot={adSlots.auto} />
</div>
