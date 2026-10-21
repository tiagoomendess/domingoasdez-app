<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import ChipGroup from '#lib/components/ui/ChipGroup.svelte';
	import HomeFeed from '#lib/components/feed/HomeFeed.svelte';
	import { chipOptions } from '#lib/components/feed/registry.ts';
	import { tiposQuery, type FeedItem, type FeedType } from '#lib/feed.ts';
	import logo from '#lib/assets/logo.png';
	import { m } from '#lib/messages.ts';
	import { withNavigationLoader } from '#lib/navigation.svelte.ts';
	import { pullRefresh } from '#lib/pull-to-refresh.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const chips = chipOptions();
	const feedKey = $derived(
		`${tiposQuery(data.types)}|${data.nextCursor ?? ''}|${data.items[0] ? `${data.items[0].type}:${data.items[0].id}` : 'empty'}|${data.items.length}`
	);

	function onTypesChange(value: FeedType[]) {
		void withNavigationLoader(
			goto(`/?tipos=${tiposQuery(value)}`, { replace: true, reset: false })
		);
	}

	async function refresh() {
		await refreshAll();
	}
</script>

<svelte:head>
	<title>{m.feed_brand()}</title>
	<meta name="description" content={m.feed_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1
		class="flex items-center gap-3 text-large-title whitespace-nowrap text-ink max-[22.5rem]:gap-2.5 max-[22.5rem]:text-title-1"
	>
		<img src={logo} alt="" width="44" height="44" class="size-11 shrink-0 max-[22.5rem]:size-9" />
		{m.feed_brand()}
	</h1>
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

<div role="feed" aria-busy={pullRefresh.refreshing || undefined}>
	{#key feedKey}
		<HomeFeed
			items={data.items as FeedItem[]}
			nextCursor={data.nextCursor}
			types={data.types}
			partners={data.partners}
			disclaimerHref={data.disclaimerHref}
			feedbackHref={data.feedbackHref}
			refreshing={pullRefresh.refreshing}
			onrefresh={refresh}
		/>
	{/key}
</div>
