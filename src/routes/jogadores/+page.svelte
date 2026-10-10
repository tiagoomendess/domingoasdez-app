<script lang="ts">
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';
	import AdSenseUnit from '#lib/components/ads/AdSenseUnit.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { adSlots } from '#lib/ads.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const prevHref = $derived(data.page > 1 ? `/jogadores?page=${data.page - 1}` : null);
	const nextHref = $derived(
		data.page < data.totalPages ? `/jogadores?page=${data.page + 1}` : null
	);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{data.seo.title}</h1>
</header>

{#if data.players.length === 0}
	<EmptyState
		icon={UsersThreeIcon}
		title={m.players_index_empty_title()}
		description={m.players_index_empty_text()}
	/>
{:else}
	<ListGroup>
		{#each data.players as player (player.id)}
			<ListRow title={player.name} href={player.href}>
				{#snippet leading()}
					<Avatar name={player.name} src={player.picture} size={40} />
				{/snippet}
			</ListRow>
		{/each}
	</ListGroup>
{/if}

{#if data.totalPages > 1}
	<nav aria-label={m.players_index_title()} class="mt-4 flex items-center justify-between gap-3">
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
