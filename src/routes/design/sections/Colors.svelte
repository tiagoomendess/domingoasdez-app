<script lang="ts">
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';

	const surfaces = [
		{ token: 'canvas', swatch: 'bg-canvas', use: 'Page background' },
		{ token: 'surface', swatch: 'bg-surface', use: 'Cards, list groups' },
		{ token: 'surface-muted', swatch: 'bg-surface-muted', use: 'Inputs inside cards' },
		{ token: 'fill', swatch: 'bg-fill', use: 'Unselected chips, pressed rows' },
		{ token: 'fill-strong', swatch: 'bg-fill-strong', use: 'Skeletons, switch track' },
		{ token: 'scrim', swatch: 'bg-scrim', use: 'Behind modal sheets' }
	];

	const signals = [
		{ token: 'accent', swatch: 'bg-accent', use: 'Filled buttons, selection' },
		{ token: 'accent-tint', swatch: 'bg-accent-tint', use: 'Tinted buttons, active tab' },
		{ token: 'live', swatch: 'bg-live', use: 'Live games only' },
		{ token: 'live-tint', swatch: 'bg-live-tint', use: 'Live pill, score flash' },
		{ token: 'warmup', swatch: 'bg-warmup', use: 'Warm-up state' },
		{ token: 'success', swatch: 'bg-success', use: 'Confirmations, switches' },
		{ token: 'warning', swatch: 'bg-warning', use: 'Postponed games' },
		{ token: 'danger', swatch: 'bg-danger', use: 'Errors, destructive' }
	];

	const inks = [
		{ token: 'ink', classes: 'text-ink', use: 'Primary text' },
		{ token: 'ink-secondary', classes: 'text-ink-secondary', use: 'Supporting text, losing team' },
		{
			token: 'ink-tertiary',
			classes: 'text-ink-tertiary',
			use: 'Metadata — lightest readable text'
		},
		{ token: 'accent-text', classes: 'text-accent-text', use: 'Links and tinted labels' }
	];

	const scales = [
		{
			name: 'brand',
			note: '600 = legacy #107db7',
			steps: [
				['50', 'bg-brand-50'],
				['100', 'bg-brand-100'],
				['200', 'bg-brand-200'],
				['300', 'bg-brand-300'],
				['400', 'bg-brand-400'],
				['500', 'bg-brand-500'],
				['600', 'bg-brand-600'],
				['700', 'bg-brand-700'],
				['800', 'bg-brand-800'],
				['900', 'bg-brand-900'],
				['950', 'bg-brand-950']
			]
		},
		{
			name: 'gold',
			note: 'Decorative only, never text',
			steps: [
				['300', 'bg-gold-300'],
				['400', 'bg-gold-400'],
				['500', 'bg-gold-500'],
				['600', 'bg-gold-600'],
				['700', 'bg-gold-700']
			]
		},
		{
			name: 'pitch',
			note: 'Legacy #3b814f',
			steps: [
				['400', 'bg-pitch-400'],
				['500', 'bg-pitch-500'],
				['600', 'bg-pitch-600']
			]
		}
	];
</script>

{#snippet swatches(items: { token: string; swatch: string; use: string }[])}
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each items as item (item.token)}
			<div class="rounded-card bg-surface p-2 ring-1 ring-line dark:ring-0">
				<div class={['h-16 rounded-field ring-1 ring-line ring-inset', item.swatch]}></div>
				<p class="mt-2 px-1 text-footnote font-semibold text-ink">{item.token}</p>
				<p class="px-1 pb-1 text-caption font-normal text-ink-tertiary">{item.use}</p>
			</div>
		{/each}
	</div>
{/snippet}

<DesignSection
	id="cor"
	title="Colour"
	description="Semantic tokens swap between light and dark automatically. Toggle the theme (top right) to compare."
>
	<Specimen label="Surfaces and fills">
		{@render swatches(surfaces)}
	</Specimen>

	<Specimen label="Text">
		<ul
			class="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0"
		>
			{#each inks as ink (ink.token)}
				<li class="flex items-center gap-4 px-4 py-3">
					<span class={['w-10 text-title-2', ink.classes]}>Aa</span>
					<span class="min-w-0">
						<span class="block text-subhead font-semibold text-ink">{ink.token}</span>
						<span class="block text-footnote text-ink-tertiary">{ink.use}</span>
					</span>
				</li>
			{/each}
		</ul>
	</Specimen>

	<Specimen label="Accent and signals" note="Live is the only loud colour">
		{@render swatches(signals)}
	</Specimen>

	<Specimen label="Brand scales" note="Static in both themes">
		<div class="space-y-4 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			{#each scales as scale (scale.name)}
				<div>
					<p class="mb-2 flex items-baseline justify-between text-footnote">
						<span class="font-semibold text-ink">{scale.name}</span>
						<span class="text-ink-tertiary">{scale.note}</span>
					</p>
					<div class="flex gap-1">
						{#each scale.steps as [step, swatch] (step)}
							<div class="min-w-0 flex-1 text-center">
								<div class={['h-10 rounded-badge ring-1 ring-line ring-inset', swatch]}></div>
								<span class="mt-1 block text-caption font-normal text-ink-tertiary tabular-nums">
									{step}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</Specimen>
</DesignSection>
