<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Icon } from '#lib/components/types.ts';

	type Props = {
		selected?: boolean;
		rejected?: boolean;
		icon?: Icon;
		onclick?: (event: MouseEvent) => void;
		onrejectend?: () => void;
		children: Snippet;
	};

	let {
		selected = false,
		rejected = false,
		icon: ChipIcon,
		onclick,
		onrejectend,
		children
	}: Props = $props();
</script>

<button
	type="button"
	aria-pressed={selected}
	class={[
		'relative inline-flex h-9 shrink-0 pressable snap-start items-center gap-1.5 rounded-full px-4 text-subhead font-medium whitespace-nowrap',
		// Visually 36px tall, but the hit area is extended to the 44px minimum
		'after:absolute after:inset-x-0 after:-inset-y-1',
		selected ? 'bg-accent text-accent-fg' : 'bg-fill text-ink hover:bg-fill-strong',
		rejected && 'animate-reject-shake motion-reduce:animate-none'
	]}
	{onclick}
	onanimationend={onrejectend}
>
	{#if ChipIcon}
		<ChipIcon size={16} weight={selected ? 'fill' : 'regular'} />
	{/if}
	{@render children()}
</button>
