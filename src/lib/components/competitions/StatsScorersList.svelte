<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import type { StatsScorer } from '#lib/competition-stats.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		scorers: StatsScorer[];
	};

	let { scorers }: Props = $props();
</script>

<section class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
	{#if scorers.length === 0}
		<p class="px-4 py-8 text-center text-callout text-ink-secondary">
			{m.competition_stats_unavailable()}
		</p>
	{:else}
		<ol>
			{#each scorers as scorer, i (scorer.playerId)}
				<li class="scorer">
					<a
						href={scorer.href}
						class="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-fill active:bg-fill-strong"
					>
						<span
							class="w-6 shrink-0 text-center text-footnote font-semibold text-ink-tertiary tabular-nums"
						>
							{i + 1}
						</span>
						<Avatar name={scorer.shortName || scorer.name} src={scorer.picture} size={40} />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-body font-medium text-ink">
								{scorer.shortName || scorer.name}
							</span>
							{#if scorer.nickname}
								<span class="block truncate text-footnote text-ink-secondary">
									{scorer.nickname}
								</span>
							{/if}
						</span>
						<span class="text-headline tabular-nums text-ink">{scorer.goals}</span>
					</a>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.scorer {
		position: relative;
	}

	.scorer::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 4.75rem;
		height: 1px;
		background-color: var(--line);
	}

	.scorer:first-child::before {
		display: none;
	}
</style>
