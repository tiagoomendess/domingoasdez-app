<script lang="ts">
	import AdSenseUnit from '#lib/components/ads/AdSenseUnit.svelte';
	import { adSlots } from '#lib/ads.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const page = $derived(data.page);
	const metaDescription = $derived.by(() => {
		const plain = page.html
			.replace(/<[^>]*>/g, ' ')
			.replace(/&nbsp;/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		return plain.length > 160 ? `${plain.slice(0, 160)}…` : plain;
	});
</script>

<svelte:head>
	<title>{page.title} · {m.feed_brand()}</title>
	{#if metaDescription}
		<meta name="description" content={metaDescription} />
	{/if}
</svelte:head>

<article>
	{#if page.picture}
		<img
			src={page.picture}
			alt=""
			loading="lazy"
			decoding="async"
			class="mb-4 aspect-video w-full rounded-inner bg-fill object-cover"
		/>
	{/if}

	<h1 class="text-title-1 text-ink">{page.title}</h1>

	{#if adSlots.horizontal}
		<div class="mt-6">
			<AdSenseUnit adSlot={adSlots.horizontal} shape="horizontal" />
		</div>
	{/if}

	<div class="prose mt-6 max-w-none rich-text">
		{@html page.html}
	</div>
</article>

<div class="mt-6">
	<AdSenseUnit adSlot={adSlots.auto} />
</div>
