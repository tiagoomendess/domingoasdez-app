<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		note?: string;
		class?: string;
		children: Snippet;
	};

	let { label, note, class: className, children }: Props = $props();
</script>

<div>
	<div class="mb-2 flex items-baseline justify-between gap-3 px-1">
		<h3 class="text-headline text-ink">{label}</h3>
		{#if note}
			<span class="text-footnote text-ink-tertiary">{note}</span>
		{/if}
	</div>
	<div class={className}>
		{@render children()}
	</div>
</div>
