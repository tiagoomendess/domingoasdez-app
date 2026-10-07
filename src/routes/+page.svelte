<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import ChipGroup from '#lib/components/ui/ChipGroup.svelte';
	import PullToRefresh from '#lib/components/shell/PullToRefresh.svelte';
	import HomeFeed from '#lib/components/feed/HomeFeed.svelte';
	import { chipOptions } from '#lib/components/feed/registry.ts';
	import { tiposQuery, type FeedItem, type FeedType } from '#lib/feed.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let refreshing = $state(false);
	const chips = chipOptions();
	const feedKey = $derived(
		`${tiposQuery(data.types)}|${data.nextCursor ?? ''}|${data.items[0] ? `${data.items[0].type}:${data.items[0].id}` : 'empty'}|${data.items.length}`
	);

	function onTypesChange(value: FeedType[]) {
		goto(`/?tipos=${tiposQuery(value)}`, { replace: true, reset: false });
	}

	async function refresh() {
		await refreshAll();
	}
</script>

<svelte:head>
	<title>{m.feed_brand()}</title>
	<meta name="description" content={m.feed_meta_description()} />
</svelte:head>

<PullToRefresh bind:refreshing onrefresh={refresh}>
	<header class="px-1 pb-3">
		<h1 class="text-large-title text-ink">{m.feed_brand()}</h1>
	</header>

	<div class="mb-3">
		<ChipGroup
			label={m.feed_filter()}
			options={chips}
			value={data.types}
			min={1}
			onchange={onTypesChange}
		/>
	</div>

	{#key feedKey}
		<HomeFeed
			items={data.items as FeedItem[]}
			nextCursor={data.nextCursor}
			types={data.types}
			disclaimerHref={data.disclaimerHref}
			{refreshing}
			onrefresh={refresh}
		/>
	{/key}
</PullToRefresh>
