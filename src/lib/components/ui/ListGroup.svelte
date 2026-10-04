<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title?: string;
		footer?: string;
		headingLevel?: 2 | 3 | 4;
		class?: string;
		children: Snippet;
	};

	let { title, footer, headingLevel = 2, class: className, children }: Props = $props();
</script>

<section class={className}>
	{#if title}
		<svelte:element
			this={`h${headingLevel}`}
			class="mb-2 px-4 text-footnote font-semibold text-ink-secondary"
		>
			{title}
		</svelte:element>
	{/if}
	<ul class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
		{@render children()}
	</ul>
	{#if footer}
		<p class="mt-2 px-4 text-footnote text-ink-tertiary">{footer}</p>
	{/if}
</section>
