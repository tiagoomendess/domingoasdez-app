<script lang="ts">
	import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import DisclaimerCard from './DisclaimerCard.svelte';
	import FeedSkeleton from './FeedSkeleton.svelte';
	import { feedTypes } from './registry.ts';
	import { tiposQuery, type FeedItem, type FeedType } from '#lib/feed.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		items: FeedItem[];
		nextCursor: string | null;
		types: FeedType[];
		disclaimerHref?: string | null;
		refreshing?: boolean;
		onrefresh: () => Promise<void>;
	};

	let {
		items: initialItems,
		nextCursor: initialCursor,
		types,
		disclaimerHref = null,
		refreshing = false,
		onrefresh
	}: Props = $props();

	let extra = $state.raw<FeedItem[]>([]);
	/** `undefined` means "use the server cursor"; set after the first client page load. */
	let clientCursor = $state<string | null | undefined>(undefined);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);

	const items = $derived([...initialItems, ...extra]);
	const nextCursor = $derived(clientCursor === undefined ? initialCursor : clientCursor);
	const skeletonCount = $derived(Math.max(items.length, 3));

	async function loadMore() {
		if (loadingMore || !nextCursor) return;
		loadingMore = true;
		error = null;
		try {
			const params = new URLSearchParams({
				tipos: tiposQuery(types),
				cursor: nextCursor
			});
			const res = await fetch(`/api/feed?${params}`);
			if (!res.ok) throw new Error(m.feed_error());
			const page = (await res.json()) as { items: FeedItem[]; nextCursor: string | null };
			extra = [...extra, ...page.items];
			clientCursor = page.nextCursor;
		} catch {
			error = m.feed_error();
		} finally {
			loadingMore = false;
		}
	}
</script>

{#if refreshing}
	<FeedSkeleton count={skeletonCount} />
{:else if items.length === 0 && !loadingMore}
	<div class="space-y-3">
		{#if disclaimerHref}
			<DisclaimerCard href={disclaimerHref} />
		{/if}
		<EmptyState icon={NewspaperIcon} title={m.feed_empty_title()} description={m.feed_empty_text()} />
	</div>
{:else}
	<div class="space-y-3">
		{#each items as item, index (`${item.type}-${item.id}`)}
			{#if index === 1 && disclaimerHref}
				<DisclaimerCard href={disclaimerHref} />
			{/if}
			{#if item.type === 'article'}
				{@const Card = feedTypes.article.component}
				<Card {...item.data} />
			{:else}
				{@const Card = feedTypes.poll.component}
				<Card {...item.data} />
			{/if}
		{/each}
		{#if items.length === 1 && disclaimerHref}
			<DisclaimerCard href={disclaimerHref} />
		{/if}
	</div>

	{#if loadingMore}
		<div class="mt-3">
			<FeedSkeleton count={2} />
		</div>
	{/if}

	{#if nextCursor}
		<div
			{@attach (node) => {
				const io = new IntersectionObserver(
					(entries) => {
						if (entries[0]?.isIntersecting) void loadMore();
					},
					{ rootMargin: '800px' }
				);
				io.observe(node);
				return () => io.disconnect();
			}}
			class="h-px"
			aria-hidden="true"
		></div>
	{/if}
{/if}

{#if error && !refreshing}
	<div class="mt-4">
		<EmptyState icon={WarningCircleIcon} title={error}>
			{#snippet action()}
				<Button variant="tinted" onclick={() => (nextCursor ? loadMore() : onrefresh())}>
					{m.feed_retry()}
				</Button>
			{/snippet}
		</EmptyState>
	</div>
{/if}
