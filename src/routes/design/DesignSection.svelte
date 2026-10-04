<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		id: string;
		title: string;
		description?: string;
		children: Snippet;
	};

	let { id, title, description, children }: Props = $props();
</script>

<section {id} aria-labelledby="{id}-title" class="scroll-mt-(--content-top)">
	<header class="mb-5 px-1">
		<h2 id="{id}-title" class="text-title-1 text-ink">{title}</h2>
		{#if description}
			<p class="mt-1 text-subhead text-ink-secondary">{description}</p>
		{/if}
	</header>
	<div class="space-y-6">
		{@render children()}
	</div>
</section>
