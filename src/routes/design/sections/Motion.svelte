<script lang="ts">
	import PlayIcon from 'phosphor-svelte/lib/PlayIcon';
	import HandTapIcon from 'phosphor-svelte/lib/HandTapIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Chip from '#lib/components/ui/Chip.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';

	const curves = [
		{
			name: 'ease-fluid · --dur-slow',
			value: '380ms',
			use: 'Sheets, page slides',
			classes: 'duration-(--dur-slow) ease-fluid'
		},
		{
			name: 'ease-snappy · --dur-base',
			value: '240ms',
			use: 'Chrome, chips, small UI',
			classes: 'duration-(--dur-base) ease-snappy'
		},
		{
			name: 'ease-exit · --dur-fast',
			value: '160ms',
			use: 'Things leaving the screen',
			classes: 'duration-(--dur-fast) ease-exit'
		}
	];

	let moved = $state(false);
	let rejected = $state(false);
</script>

<DesignSection
	id="movimento"
	title="Motion"
	description="Instant response, interruptible transitions, springs for anything dragged. Reduced motion swaps slides for short cross-fades."
>
	<Specimen label="Curves and durations">
		<div class="space-y-4 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			{#each curves as curve (curve.name)}
				<div>
					<p class="flex items-baseline justify-between gap-3 text-footnote">
						<span class="font-semibold text-ink">{curve.name}</span>
						<span class="text-ink-tertiary">{curve.value} · {curve.use}</span>
					</p>
					<div class="@container mt-2 h-6 rounded-full bg-fill p-1">
						<div
							class={[
								'size-4 rounded-full bg-accent transition-[translate] motion-reduce:transition-none',
								curve.classes
							]}
							style:translate={moved ? 'calc(100cqw - 1rem) 0' : '0 0'}
						></div>
					</div>
				</div>
			{/each}
			<Button variant="tinted" icon={PlayIcon} onclick={() => (moved = !moved)}>
				Play — tap again mid-flight to reverse
			</Button>
		</div>
	</Specimen>

	<Specimen label="Feedback" note="On pointer-down, not on release">
		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="flex pressable flex-col items-center gap-2 rounded-card bg-surface p-5 text-center ring-1 ring-line dark:ring-0"
			>
				<HandTapIcon size={28} class="text-accent-text" />
				<span class="text-subhead font-semibold text-ink">Press and hold</span>
				<span class="text-caption font-normal text-ink-tertiary">pressable · scale 0.97</span>
			</button>
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-card bg-surface p-5 text-center ring-1 ring-line dark:ring-0"
			>
				<Chip
					selected
					{rejected}
					onclick={() => (rejected = true)}
					onrejectend={() => (rejected = false)}
				>
					Último filtro
				</Chip>
				<span class="text-caption font-normal text-ink-tertiary">Refused action · shake</span>
			</div>
			<div
				class="col-span-2 flex items-center justify-between gap-3 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0"
			>
				<span class="text-subhead text-ink">Live pulse (static under reduced motion)</span>
				<StatusPill status="live" />
			</div>
		</div>
	</Specimen>
</DesignSection>
