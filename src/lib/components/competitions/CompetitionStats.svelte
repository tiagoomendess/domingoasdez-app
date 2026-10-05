<script lang="ts">
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import StatsExtremeCard from '#lib/components/competitions/StatsExtremeCard.svelte';
	import StatsScorersList from '#lib/components/competitions/StatsScorersList.svelte';
	import type { ExtremeClubs, StatsScorer } from '#lib/competition-stats.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		scorers: StatsScorer[];
		attack: ExtremeClubs;
		defense: ExtremeClubs;
	};

	let { scorers, attack, defense }: Props = $props();
</script>

<div class="space-y-8">
	<section class="space-y-3">
		<SectionHeader title={m.competition_stats_scorers()} />
		<StatsScorersList {scorers} />
	</section>

	<section class="space-y-3">
		<SectionHeader title={m.competition_stats_attack()} />
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<StatsExtremeCard variant="best" kind="attack" clubs={attack.best} />
			<StatsExtremeCard variant="worst" kind="attack" clubs={attack.worst} />
		</div>
	</section>

	<section class="space-y-3">
		<SectionHeader title={m.competition_stats_defense()} />
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<StatsExtremeCard variant="best" kind="defense" clubs={defense.best} />
			<StatsExtremeCard variant="worst" kind="defense" clubs={defense.worst} />
		</div>
	</section>
</div>
