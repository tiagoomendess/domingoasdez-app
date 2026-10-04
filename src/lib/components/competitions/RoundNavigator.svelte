<script lang="ts">
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { m } from '#lib/messages.ts';

	type Props = {
		label: string;
		hasPrev: boolean;
		hasNext: boolean;
		onprev: () => void;
		onnext: () => void;
	};

	let { label, hasPrev, hasNext, onprev, onnext }: Props = $props();
</script>

<div class="flex items-center justify-between gap-2 px-2 py-1">
	<IconButton
		label={m.competition_round_prev()}
		variant="fill"
		disabled={!hasPrev}
		onclick={onprev}
	>
		<CaretLeftIcon size={20} weight="bold" />
	</IconButton>
	<span class="text-headline text-ink tabular-nums">{label}</span>
	<IconButton
		label={m.competition_round_next()}
		variant="fill"
		disabled={!hasNext}
		onclick={onnext}
	>
		<CaretRightIcon size={20} weight="bold" />
	</IconButton>
</div>
