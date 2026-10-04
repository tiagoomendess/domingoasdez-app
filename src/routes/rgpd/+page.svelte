<script lang="ts">
	import { rgpdHtml } from '#lib/content/legal.ts';
	import { m } from '#lib/messages.ts';
</script>

<svelte:head>
	<title>{m.pages_rgpd()} · {m.feed_brand()}</title>
</svelte:head>

<article>
	<h1 class="text-title-1 text-ink">{m.pages_rgpd()}</h1>
	<div class="prose mt-6 max-w-none rich-text">
		{@html rgpdHtml}
	</div>
</article>
