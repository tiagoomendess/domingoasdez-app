<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Icon } from '#lib/components/types.ts';

	type Props = {
		icon: Icon;
		title: string;
		description?: string;
		action?: Snippet;
	};

	let { icon: EmptyIcon, title, description, action }: Props = $props();
</script>

<div class="flex flex-col items-center px-6 py-10 text-center">
	<EmptyIcon size={48} class="text-ink-tertiary" />
	<p class="mt-4 text-headline text-ink">{title}</p>
	{#if description}
		<p class="mt-1 max-w-xs text-subhead text-ink-secondary">{description}</p>
	{/if}
	{#if action}
		<div class="mt-5">{@render action()}</div>
	{/if}
</div>
