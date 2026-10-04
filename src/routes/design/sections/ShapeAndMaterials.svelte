<script lang="ts">
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import { clubs, pitchPhoto } from '../sample-data.ts';

	const radii = [
		{ token: 'rounded-badge', value: '8px', classes: 'rounded-badge' },
		{ token: 'rounded-inner', value: '12px', classes: 'rounded-inner' },
		{ token: 'rounded-field', value: '14px', classes: 'rounded-field' },
		{ token: 'rounded-card', value: '22px', classes: 'rounded-card' },
		{ token: 'rounded-sheet', value: '32px', classes: 'rounded-sheet' },
		{ token: 'rounded-full', value: 'capsule', classes: 'rounded-full' }
	];

	const materials = [
		{ name: 'glass', classes: 'glass', use: 'Tab bar, floating buttons, toasts' },
		{ name: 'glass-thick', classes: 'glass-thick', use: 'Sheets and dialogs' },
		{
			name: 'surface',
			classes: 'bg-surface ring-1 ring-line',
			use: 'Solid content, for comparison'
		}
	];

	const crests = Object.values(clubs).filter((club) => club.emblem);
	const backdropEmblems = [...crests, ...crests, ...crests, ...crests];
</script>

<DesignSection
	id="forma"
	title="Shape and materials"
	description="Corners are concentric, and translucent glass is reserved for the floating layer."
>
	<Specimen label="Radii">
		<div class="grid grid-cols-3 gap-3">
			{#each radii as radius (radius.token)}
				<div class="text-center">
					<div
						class={[
							'mx-auto h-20 w-full bg-accent-tint ring-1 ring-accent/30 ring-inset',
							radius.classes
						]}
					></div>
					<p class="mt-2 text-footnote font-semibold text-ink">{radius.token}</p>
					<p class="text-caption font-normal text-ink-tertiary">{radius.value}</p>
				</div>
			{/each}
		</div>
	</Specimen>

	<Specimen label="Concentric corners" note="inner = outer − padding">
		<div class="rounded-card bg-surface p-2.5 ring-1 ring-line dark:ring-0">
			<img src={pitchPhoto('day')} alt="" class="aspect-video w-full rounded-inner object-cover" />
			<p class="px-1.5 pt-3 pb-1.5 text-footnote text-ink-secondary">
				Card 22px with 10px padding → image 12px (<code>rounded-inner</code>).
			</p>
		</div>
	</Specimen>

	<Specimen label="Materials" note="Over a busy background">
		<div class="relative overflow-hidden rounded-card">
			<img src={pitchPhoto('day')} alt="" class="absolute inset-0 size-full object-cover" />
			<div
				aria-hidden="true"
				class="absolute inset-0 flex flex-wrap content-start gap-3 p-4 opacity-90"
			>
				{#each backdropEmblems as club, i (i)}
					<Emblem src={club.emblem} name={club.name} size={40} plate={false} decorative />
				{/each}
			</div>
			<div class="relative space-y-3 px-4 py-6">
				{#each materials as material (material.name)}
					<div
						class={[
							'flex items-center justify-between gap-3 rounded-full px-5 py-3',
							material.classes
						]}
					>
						<span class="text-headline text-ink">{material.name}</span>
						<span class="truncate text-footnote text-ink-secondary">{material.use}</span>
					</div>
				{/each}
			</div>
		</div>
		<p class="mt-2 px-1 text-footnote text-ink-tertiary">
			Glass never sits on glass. It turns solid automatically with reduced transparency, more
			contrast, or no <code>backdrop-filter</code> support. Scroll this page to see the scroll-edge fades
			under the floating chrome.
		</p>
	</Specimen>
</DesignSection>
