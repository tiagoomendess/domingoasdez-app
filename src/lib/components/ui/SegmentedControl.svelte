<script lang="ts" generics="T extends string">
	type Option = { value: T; label: string };

	type Props = {
		options: Option[];
		value: T;
		label: string;
		onchange?: (value: T) => void;
	};

	let { options, value = $bindable(), label, onchange }: Props = $props();

	const index = $derived(
		Math.max(
			0,
			options.findIndex((o) => o.value === value)
		)
	);

	function select(option: T) {
		if (option === value) return;
		value = option;
		onchange?.(option);
	}
</script>

<div
	role="group"
	aria-label={label}
	class="relative grid h-10 auto-cols-fr grid-flow-col rounded-field bg-fill p-0.5"
>
	<span
		aria-hidden="true"
		class="absolute inset-y-0.5 left-0.5 rounded-inner bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-[translate] duration-(--dur-base) ease-fluid motion-reduce:transition-none dark:bg-fill-strong dark:shadow-none"
		style:width="calc((100% - 0.25rem) / {options.length})"
		style:translate="{index * 100}% 0"
	></span>
	{#each options as option (option.value)}
		{@const selected = option.value === value}
		<button
			type="button"
			aria-pressed={selected}
			class={[
				'relative rounded-inner px-3 text-subhead whitespace-nowrap transition-colors duration-(--dur-fast)',
				selected ? 'font-semibold text-ink' : 'font-medium text-ink-secondary hover:text-ink'
			]}
			onclick={() => select(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
