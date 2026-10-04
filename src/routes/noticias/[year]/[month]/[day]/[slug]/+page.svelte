<script lang="ts">
	import ArticleMedia from '#lib/components/articles/ArticleMedia.svelte';
	import { formatArticleDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const article = $derived(data.article);
	const firstTag = $derived(article.tags?.split(',')[0]?.trim() || null);
	const metaDescription = $derived.by(() => {
		const fromDesc = article.description?.trim();
		if (fromDesc) return fromDesc;
		const plain = article.html
			.replace(/<[^>]*>/g, ' ')
			.replace(/&nbsp;/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		return plain.length > 160 ? `${plain.slice(0, 160)}…` : plain;
	});
</script>

<svelte:head>
	<title>{article.title} · {m.feed_brand()}</title>
	{#if metaDescription}
		<meta name="description" content={metaDescription} />
	{/if}
</svelte:head>

<article>
	{#if article.media && article.media.type !== 'none'}
		<div class="mb-4">
			<ArticleMedia
				type={article.media.type}
				url={article.media.url}
				thumbnailUrl={article.media.thumbnailUrl}
				youtubeId={article.media.youtubeId}
				title={article.title}
			/>
		</div>
	{/if}

	<h1 class="text-title-1 text-ink">{article.title}</h1>

	<p class="mt-2 text-footnote text-ink-tertiary">
		<time datetime={article.date}>{formatArticleDate(article.date)}</time>
		{#if firstTag}
			<span aria-hidden="true" class="mx-1">·</span>{firstTag}
		{/if}
	</p>

	{#if article.description?.trim()}
		<p class="mt-3 text-callout text-ink-secondary">{article.description}</p>
	{/if}

	<div class="prose mt-6 max-w-none rich-text">
		{@html article.html}
	</div>
</article>
