<script lang="ts">
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import AdSenseUnit from '#lib/components/ads/AdSenseUnit.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { adSlots } from '#lib/ads.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.nav_competitions()} · {m.feed_brand()}</title>
	<meta name="description" content={m.competitions_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.nav_competitions()}</h1>
</header>

{#if adSlots.horizontal}
	<div class="mb-4">
		<AdSenseUnit adSlot={adSlots.horizontal} shape="horizontal" />
	</div>
{/if}

{#if data.competitions.length === 0}
	<EmptyState
		icon={TrophyIcon}
		title={m.competitions_empty_title()}
		description={m.competitions_empty_text()}
	/>
	<div class="mt-4">
		<AdSenseUnit adSlot={adSlots.auto} />
	</div>
{:else}
	{#snippet competitionRow(c: (typeof data.competitions)[number])}
		<ListRow title={c.name} subtitle={c.seasonLabel ?? undefined} href={c.href ?? undefined}>
			{#snippet leading()}
				<Emblem src={c.emblem} name={c.name} size={40} shape="rounded" decorative />
			{/snippet}
		</ListRow>
	{/snippet}

	<div class="md:hidden">
		<ListGroup>
			{#each data.competitions as c (c.id)}
				{@render competitionRow(c)}
			{/each}
		</ListGroup>
	</div>

	<div class="hidden gap-3 md:grid md:grid-cols-2">
		{#each data.competitions as c (c.id)}
			<ListGroup>
				{@render competitionRow(c)}
			</ListGroup>
		{/each}
	</div>

	<div class="mt-4">
		<AdSenseUnit adSlot={adSlots.auto} />
	</div>
{/if}
