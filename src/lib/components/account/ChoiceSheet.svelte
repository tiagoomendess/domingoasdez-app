<script lang="ts" generics="T extends string">
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import Sheet from '#lib/components/ui/Sheet.svelte';

	type Option = { value: T; label: string };

	type Props = {
		open: boolean;
		title: string;
		options: Option[];
		value: T;
		onchange?: (value: T) => void;
	};

	let { open = $bindable(false), title, options, value, onchange }: Props = $props();

	function select(option: T) {
		if (option !== value) onchange?.(option);
		open = false;
	}
</script>

<Sheet bind:open {title}>
	<div role="radiogroup" aria-label={title} class="-mx-5">
		{#each options as option (option.value)}
			{@const selected = option.value === value}
			<button
				type="button"
				role="radio"
				aria-checked={selected}
				class={[
					'flex min-h-13 w-full items-center gap-3 px-5 text-left transition-colors',
					'hover:bg-fill active:bg-fill-strong'
				]}
				onclick={() => select(option.value)}
			>
				<span
					class={['min-w-0 flex-1 text-body', selected ? 'font-semibold text-ink' : 'text-ink']}
				>
					{option.label}
				</span>
				{#if selected}
					<CheckIcon size={20} weight="bold" class="shrink-0 text-accent-text" />
				{/if}
			</button>
		{/each}
	</div>
</Sheet>
