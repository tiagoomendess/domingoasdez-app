<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'disabled'> & {
		label: string;
		variant?: 'glass' | 'fill' | 'plain';
		href?: string;
		disabled?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		label,
		variant = 'glass',
		href,
		disabled = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const classes = $derived([
		'pressable inline-grid size-11 shrink-0 place-items-center rounded-full text-ink',
		{
			glass: 'glass',
			fill: 'bg-fill hover:bg-fill-strong active:bg-fill-strong',
			plain: 'hover:bg-fill active:bg-fill'
		}[variant],
		disabled && 'pointer-events-none opacity-40',
		className
	]);
</script>

{#if href && !disabled}
	<a {href} class={classes} aria-label={label} {...rest}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={classes} aria-label={label} {disabled} {...rest}>
		{@render children()}
	</button>
{/if}
