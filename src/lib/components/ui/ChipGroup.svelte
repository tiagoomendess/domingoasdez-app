<script lang="ts" generics="T extends string">
	import Chip from '#lib/components/ui/Chip.svelte';
	import type { Icon } from '#lib/components/types.ts';

	type Option = { value: T; label: string; icon?: Icon };

	type Props = {
		options: Option[];
		value: T[];
		label: string;
		min?: number;
		onchange?: (value: T[]) => void;
	};

	let { options, value = $bindable(), label, min = 1, onchange }: Props = $props();

	let rejected = $state<T | null>(null);

	function toggle(option: T) {
		if (value.includes(option)) {
			if (value.length <= min) {
				rejected = option;
				navigator.vibrate?.(10);
				return;
			}
			value = value.filter((v) => v !== option);
		} else {
			value = options
				.filter((o) => o.value === option || value.includes(o.value))
				.map((o) => o.value);
		}
		onchange?.(value);
	}
</script>

<div role="group" aria-label={label} class="-mx-4 rail px-4 py-1">
	{#each options as option (option.value)}
		<Chip
			selected={value.includes(option.value)}
			rejected={rejected === option.value}
			icon={option.icon}
			onclick={() => toggle(option.value)}
			onrejectend={() => (rejected = null)}
		>
			{option.label}
		</Chip>
	{/each}
</div>
