<script lang="ts">
	type Props = {
		title: string;
		live?: boolean;
		count?: number;
		href?: string;
		actionLabel?: string;
		headingLevel?: 2 | 3;
	};

	let { title, live = false, count, href, actionLabel, headingLevel = 2 }: Props = $props();
</script>

<div class="flex items-center justify-between gap-3 px-1">
	<svelte:element this={`h${headingLevel}`} class="flex items-center gap-2 text-title-3 text-ink">
		{#if live}
			<span
				aria-hidden="true"
				class="size-2.5 animate-live-pulse rounded-full bg-live motion-reduce:animate-none"
			></span>
		{/if}
		{title}
		{#if count !== undefined}
			<span class="text-title-3 font-normal text-ink-tertiary tabular-nums">{count}</span>
		{/if}
	</svelte:element>
	{#if href && actionLabel}
		<a {href} class="text-subhead font-medium text-accent-text hover:underline">{actionLabel}</a>
	{/if}
</div>
