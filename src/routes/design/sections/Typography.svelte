<script lang="ts">
	import DesignSection from '../DesignSection.svelte';

	const styles = [
		{
			name: 'large-title',
			classes: 'text-large-title',
			spec: '34 / 1.2 · 700 · −0.022em',
			sample: 'Jogos'
		},
		{
			name: 'title-1',
			classes: 'text-title-1',
			spec: '28 / 1.2 · 700 · −0.02em',
			sample: 'Montalegre isola-se na liderança'
		},
		{
			name: 'title-2',
			classes: 'text-title-2',
			spec: '22 / 1.27 · 600 · −0.015em',
			sample: 'Jogos do dia'
		},
		{
			name: 'title-3',
			classes: 'text-title-3',
			spec: '20 / 1.25 · 600 · −0.01em',
			sample: 'Quem foi o melhor em campo?'
		},
		{
			name: 'headline',
			classes: 'text-headline',
			spec: '17 / 1.3 · 600',
			sample: 'Campeonato Distrital 1.ª Divisão'
		},
		{
			name: 'body',
			classes: 'text-body',
			spec: '17 / 1.47 · 400',
			sample: 'Dois golos na segunda parte deram a volta ao resultado num jogo intenso.'
		},
		{
			name: 'callout',
			classes: 'text-callout',
			spec: '16 / 1.4 · 400',
			sample: 'Entra na tua conta para votar nas sondagens.'
		},
		{
			name: 'subhead',
			classes: 'text-subhead',
			spec: '15 / 1.35 · 400',
			sample: 'Época 2026/27 · Jornada 5'
		},
		{
			name: 'footnote',
			classes: 'text-footnote',
			spec: '13 / 1.38 · 400',
			sample: 'há 2 horas · 1.ª Divisão'
		},
		{
			name: 'caption',
			classes: 'text-caption',
			spec: '12 / 1.33 · 500',
			sample: 'Sáb · Ao vivo · Fim'
		},
		{
			name: 'tab',
			classes: 'text-tab',
			spec: '11 / 1.1 · 600',
			sample: 'Início · Jogos · Competições'
		},
		{
			name: 'scoreboard',
			classes: 'text-scoreboard tabular-nums',
			spec: '48 / 1 · 700 · −0.03em · tabular',
			sample: '2 – 1'
		}
	];
</script>

<DesignSection
	id="tipografia"
	title="Typography"
	description="System font stack. Size, leading, tracking and weight travel together: tracking tightens as size grows."
>
	<ul class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
		{#each styles as style (style.name)}
			<li class="border-line px-4 py-3.5 not-first:border-t">
				<p class={['text-ink', style.classes]}>{style.sample}</p>
				<p class="mt-1 text-footnote text-ink-tertiary">
					<span class="font-semibold text-ink-secondary">text-{style.name}</span> · {style.spec}
				</p>
			</li>
		{/each}
	</ul>

	<div class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
		<p class="text-headline text-ink">Numbers are always tabular</p>
		<p class="mt-1 text-subhead text-ink-secondary">
			Scores, times and tables use <code class="text-footnote">tabular-nums</code>, so digits don't
			shift when a live score changes.
		</p>
		<div class="mt-3 grid grid-cols-2 gap-3 text-title-2 text-ink">
			<div class="rounded-inner bg-fill p-3">
				<p class="text-caption text-ink-tertiary">Proportional</p>
				<p>11 – 10<br />19:41</p>
			</div>
			<div class="rounded-inner bg-fill p-3">
				<p class="text-caption text-ink-tertiary">Tabular</p>
				<p class="tabular-nums">11 – 10<br />19:41</p>
			</div>
		</div>
	</div>
</DesignSection>
