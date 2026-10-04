<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Icon } from '#lib/components/types.ts';

	type Props = Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> & {
		variant?: 'filled' | 'tinted' | 'outline' | 'plain' | 'destructive';
		size?: 'md' | 'lg';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		icon?: Icon;
		loading?: boolean;
		disabled?: boolean;
		full?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'filled',
		size = 'md',
		href,
		type = 'button',
		icon: ButtonIcon,
		loading = false,
		disabled = false,
		full = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const classes = $derived([
		'pressable relative inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none',
		size === 'md' ? 'h-11 px-5 text-callout' : 'h-13 px-6 text-headline',
		{
			filled: 'bg-accent text-accent-fg hover:bg-accent-pressed active:bg-accent-pressed',
			tinted: 'bg-accent-tint text-accent-text hover:bg-accent/20',
			outline: 'bg-surface text-ink ring-1 ring-line-strong hover:bg-fill active:bg-fill-strong',
			plain: 'text-accent-text hover:bg-fill active:bg-fill',
			destructive: 'bg-danger/12 text-danger hover:bg-danger/18'
		}[variant],
		(disabled || loading) && 'pointer-events-none',
		disabled && 'opacity-40',
		full && 'w-full',
		className
	]);
</script>

{#snippet content()}
	<span class={['inline-flex items-center gap-2', loading && 'invisible']}>
		{#if ButtonIcon}
			<ButtonIcon size={size === 'md' ? 18 : 20} weight="bold" />
		{/if}
		{@render children()}
	</span>
	{#if loading}
		<span
			aria-hidden="true"
			class="absolute size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
		></span>
	{/if}
{/snippet}

{#if href && !disabled}
	<a {href} class={classes} aria-busy={loading || undefined} {...rest}>
		{@render content()}
	</a>
{:else}
	<button {type} class={classes} {disabled} aria-busy={loading || undefined} {...rest}>
		{@render content()}
	</button>
{/if}
