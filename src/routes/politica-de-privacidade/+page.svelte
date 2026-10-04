<script lang="ts">
	import { privacyHtml } from '#lib/content/legal.ts';
	import { m } from '#lib/messages.ts';
</script>

<svelte:head>
	<title>{m.pages_privacy()} · {m.feed_brand()}</title>
</svelte:head>

<article>
	<h1 class="text-title-1 text-ink">{m.pages_privacy()}</h1>
	<div class="prose mt-6 max-w-none rich-text">
		{@html privacyHtml}
	</div>
</article>
