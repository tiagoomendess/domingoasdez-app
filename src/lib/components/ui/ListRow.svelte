<script lang="ts">
	import type { Snippet } from 'svelte';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';

	type Props = {
		title: string;
		subtitle?: string;
		value?: string;
		href?: string;
		onclick?: (event: MouseEvent) => void;
		chevron?: boolean;
		destructive?: boolean;
		leading?: Snippet;
		trailing?: Snippet;
	};

	let {
		title,
		subtitle,
		value,
		href,
		onclick,
		chevron,
		destructive = false,
		leading,
		trailing
	}: Props = $props();

	const showChevron = $derived(chevron ?? (!!href && !destructive));
	const interactiveClasses = 'transition-colors hover:bg-fill active:bg-fill-strong';
</script>

{#snippet content()}
	{#if leading}
		<span class="flex shrink-0 items-center">{@render leading()}</span>
	{/if}
	<span class="body flex min-h-13 min-w-0 flex-1 items-center gap-3 self-stretch py-2.5 pr-4">
		<span class="min-w-0 flex-1">
			<span class={['block truncate text-body', destructive ? 'text-danger' : 'text-ink']}>
				{title}
			</span>
			{#if subtitle}
				<span class="block truncate text-footnote text-ink-secondary">{subtitle}</span>
			{/if}
		</span>
		{#if value}
			<span class="shrink-0 text-body text-ink-tertiary">{value}</span>
		{/if}
		{#if trailing}
			{@render trailing()}
		{/if}
		{#if showChevron}
			<CaretRightIcon size={16} weight="bold" class="shrink-0 text-ink-tertiary" />
		{/if}
	</span>
{/snippet}

<li class="row">
	{#if href}
		<a {href} class={['flex w-full items-center gap-3 pl-4', interactiveClasses]}>
			{@render content()}
		</a>
	{:else if onclick}
		<button
			type="button"
			class={['flex w-full items-center gap-3 pl-4 text-left', interactiveClasses]}
			{onclick}
		>
			{@render content()}
		</button>
	{:else}
		<div class="flex w-full items-center gap-3 pl-4">
			{@render content()}
		</div>
	{/if}
</li>

<style>
	/* Inset separator: starts after the leading slot, like iOS grouped lists */
	.row:not(:first-child) .body {
		border-top: 1px solid var(--line);
	}
</style>
