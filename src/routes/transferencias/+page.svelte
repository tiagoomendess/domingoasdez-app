<script lang="ts">
	import { page } from '$app/state';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import AdSenseUnit from '#lib/components/ads/AdSenseUnit.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { adSlots } from '#lib/ads.ts';
	import { formatNumericDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const prevHref = $derived(data.page > 1 ? `/transferencias?page=${data.page - 1}` : null);
	const nextHref = $derived(
		data.page < data.totalPages ? `/transferencias?page=${data.page + 1}` : null
	);
	const loginHref = $derived(
		`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`
	);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{data.seo.title}</h1>
</header>

{#if data.showLoginWall}
	<EmptyState
		icon={ArrowsLeftRightIcon}
		title={m.transfers_login_title()}
		description={m.transfers_login_text()}
	/>
	<div class="mt-4">
		<Button href={loginHref} full>{m.account_login()}</Button>
	</div>
{:else if data.transfers.length === 0}
	<EmptyState
		icon={ArrowsLeftRightIcon}
		title={m.transfers_empty_title()}
		description={m.transfers_empty_text()}
	/>
{:else}
	<ListGroup>
		{#each data.transfers as transfer (transfer.id)}
			<ListRow
				title={transfer.playerName}
				subtitle={`${transfer.fromLabel} → ${transfer.toLabel}`}
				value={formatNumericDate(transfer.date)}
				href={transfer.href ?? undefined}
			>
				{#snippet leading()}
					<Avatar name={transfer.playerName} src={transfer.picture} size={40} />
				{/snippet}
			</ListRow>
		{/each}
	</ListGroup>
{/if}

{#if data.totalPages > 1}
	<nav aria-label={m.transfers_title()} class="mt-4 flex items-center justify-between gap-3">
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
