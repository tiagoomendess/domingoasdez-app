<script lang="ts">
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import AdSenseUnit from '#lib/components/ads/AdSenseUnit.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { adSlots } from '#lib/ads.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const prevHref = $derived(data.page > 1 ? `/clubes?page=${data.page - 1}` : null);
	const nextHref = $derived(data.page < data.totalPages ? `/clubes?page=${data.page + 1}` : null);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{data.seo.title}</h1>
</header>

{#if data.clubs.length === 0}
	<EmptyState
		icon={TrophyIcon}
		title={m.clubs_index_empty_title()}
		description={m.clubs_index_empty_text()}
	/>
{:else}
	<ListGroup>
		{#each data.clubs as club (club.id)}
			<ListRow title={club.name} href={club.href}>
				{#snippet leading()}
					<Emblem src={club.emblem} name={club.name} size={40} plate={false} decorative />
				{/snippet}
			</ListRow>
		{/each}
	</ListGroup>
{/if}

{#if data.totalPages > 1}
	<nav aria-label={m.clubs_index_title()} class="mt-4 flex items-center justify-between gap-3">
		<Button
			variant="outline"
			href={prevHref ?? undefined}
			disabled={!prevHref}
			icon={CaretLeftIcon}
		>
			{m.pagination_prev()}
		</Button>
		<span class="text-footnote text-ink-secondary tabular-nums">
			{m.pagination_status({ page: data.page, total: data.totalPages })}
		</span>
		<Button
			variant="outline"
			href={nextHref ?? undefined}
			disabled={!nextHref}
			icon={CaretRightIcon}
		>
			{m.pagination_next()}
		</Button>
	</nav>
{/if}

<div class="mt-4">
	<AdSenseUnit adSlot={adSlots.auto} />
</div>
