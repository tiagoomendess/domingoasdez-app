<script lang="ts">
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

	<div class="prose mt-6 max-w-none rich-text">
		{@html page.html}
	</div>
</article>
