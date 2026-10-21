<script lang="ts">
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import { percentOf, type Outcome, type PredictionSummary } from '#lib/predictions.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		summary: PredictionSummary;
		homeName: string;
		awayName: string;
		/** The viewer's predicted outcome, marked with a check. */
		mine?: Outcome | null;
		/** What actually happened, once the game is finished and had a winner (or a draw). */
		actual?: Outcome | null;
	};

	let { summary, homeName, awayName, mine = null, actual = null }: Props = $props();

	const rows = $derived.by(() => {
		const list: { key: Outcome; label: string; count: number }[] = [
			{ key: 'home', label: homeName, count: summary.outcomes.home }
		];
		if (summary.outcomes.draw != null) {
			list.push({ key: 'draw', label: m.game_prediction_draw(), count: summary.outcomes.draw });
		}
		list.push({ key: 'away', label: awayName, count: summary.outcomes.away });
		return list;
	});

	/** Like poll results: the most picked outcome gets the gold bar (the first one on a tie). */
	const leading = $derived.by(() => {
		let best: Outcome | null = null;
		let bestCount = 0;
		for (const row of rows) {
			if (row.count > bestCount) {
				best = row.key;
				bestCount = row.count;
			}
		}
		return best;
	});
</script>

<div class="space-y-3">
	<ul class="space-y-2">
		{#each rows as row (row.key)}
			{@const percent = percentOf(row.count, summary.total)}
			<li
				class="relative flex min-h-10 items-center gap-2 overflow-hidden rounded-inner bg-fill px-3"
			>
				<span
					aria-hidden="true"
					class={[
						'absolute inset-y-0 left-0 transition-[width] duration-(--dur-slow) ease-fluid motion-reduce:transition-none',
						row.key === leading ? 'bg-gold-400/45' : 'bg-fill-strong'
					]}
					style:width="{percent}%"
				></span>
				<span
					class={[
						'relative min-w-0 flex-1 truncate text-subhead',
						row.key === actual ? 'font-semibold text-ink' : 'text-ink'
					]}
				>
					{row.label}
				</span>
				{#if row.key === mine}
					<span class="relative flex shrink-0 items-center text-accent-text">
						<CheckIcon size={14} weight="bold" aria-hidden="true" />
						<span class="sr-only">{m.game_prediction_yours()}</span>
					</span>
				{/if}
				<span class="relative shrink-0 text-subhead font-semibold text-ink tabular-nums">
					{percent}%
				</span>
			</li>
		{/each}
	</ul>

	{#if summary.topScores.length > 0}
		<div>
			<p class="text-footnote font-semibold text-ink-secondary">
				{m.game_prediction_top_scores()}
			</p>
			<ul class="mt-1.5 flex flex-wrap gap-1.5">
				{#each summary.topScores as score (`${score.home}-${score.away}`)}
					<li
						class="inline-flex h-8 items-center gap-1.5 rounded-full bg-fill px-3 text-footnote text-ink"
					>
						<span class="font-semibold tabular-nums">{score.home}–{score.away}</span>
						<span class="text-ink-tertiary tabular-nums">
							{percentOf(score.count, summary.total)}%
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<p class="text-footnote text-ink-tertiary">
		{m.game_prediction_total({ count: summary.total })}
		{#if actual}
			<span aria-hidden="true"> · </span>
			{m.game_prediction_got_winner({
				percent: percentOf(
					actual === 'draw' ? (summary.outcomes.draw ?? 0) : summary.outcomes[actual],
					summary.total
				)
			})}
		{/if}
	</p>
</div>
