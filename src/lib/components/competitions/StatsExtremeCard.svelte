<script lang="ts">
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import type { StatsClub } from '#lib/competition-stats.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		variant: 'best' | 'worst';
		kind: 'attack' | 'defense';
		clubs: StatsClub[];
	};

	let { variant, kind, clubs }: Props = $props();

	const label = $derived(
		variant === 'best' ? m.competition_stats_best() : m.competition_stats_worst()
	);

	function goalsLabel(count: number): string {
		return kind === 'attack'
			? m.competition_stats_goals_scored({ count })
			: m.competition_stats_goals_against({ count });
	}
</script>

<section
	class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0"
	aria-label="{label} — {kind === 'attack'
		? m.competition_stats_attack()
		: m.competition_stats_defense()}"
>
	<div class="px-4 pt-3">
		<span
			class={[
				'text-caption font-semibold uppercase tracking-wide',
				variant === 'best' ? 'text-success' : 'text-danger'
			]}
		>
			{label}
		</span>
	</div>

	{#if clubs.length === 0}
		<p class="px-4 py-6 text-center text-callout text-ink-secondary">
			{m.competition_stats_unavailable()}
		</p>
	{:else}
		<ul class="divide-y divide-line">
			{#each clubs as club, i (club.teamId)}
				<li>
					<a
						href={club.clubHref}
						class={[
							'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-fill active:bg-fill-strong',
							i === 0 ? 'py-4' : 'py-2.5 opacity-90'
						]}
					>
						<Emblem
							src={club.clubEmblem}
							name={club.clubName}
							size={i === 0 ? 40 : 24}
							decorative
						/>
						<span class="min-w-0 flex-1">
							<span
								class={[
									'block truncate text-ink',
									i === 0 ? 'text-headline font-semibold' : 'text-subhead'
								]}
							>
								{club.clubName}
							</span>
							{#if i === 0}
								<span class="mt-0.5 block text-footnote text-ink-secondary tabular-nums">
									{goalsLabel(club.goalCount)}
								</span>
							{/if}
						</span>
						{#if i > 0}
							<span class="text-footnote text-ink-tertiary tabular-nums">{club.goalCount}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
