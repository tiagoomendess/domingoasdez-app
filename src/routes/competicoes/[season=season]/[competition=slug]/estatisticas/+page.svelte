<script lang="ts">
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import StatsExtremeCard from '#lib/components/competitions/StatsExtremeCard.svelte';
	import StatsScorersList from '#lib/components/competitions/StatsScorersList.svelte';
	import { goto } from '$app/navigation';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Vista = 'jogos' | 'classificacao' | 'estatisticas';

	let vista = $state<Vista>('estatisticas');

	const vistaOptions = $derived.by(() => {
		const options: { value: Vista; label: string }[] = [
			{ value: 'jogos', label: m.competition_view_games() }
		];
		if (data.hasPointsGroup) {
			options.push({ value: 'classificacao', label: m.competition_view_standings() });
		}
		options.push({ value: 'estatisticas', label: m.competition_view_stats() });
		return options;
	});

	function setVista(value: Vista) {
		vista = value;
		if (value === 'estatisticas') return;
		const url =
			value === 'jogos'
				? data.competitionHref
				: `${data.competitionHref}?vista=classificacao`;
		void goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head>
	<title>{m.competition_view_stats()} · {data.displayName} · {m.feed_brand()}</title>
	<meta
		name="description"
		content={m.competition_stats_meta_description({ name: data.displayName })}
	/>
</svelte:head>

<header class="flex flex-col gap-4 px-1 pb-4">
	<div class="flex items-start gap-4">
		<a href={data.competitionHref} class="shrink-0">
			<Emblem src={data.emblem} name={data.displayName} size={72} shape="rounded" />
		</a>
		<div class="min-w-0 flex-1 pt-1">
			<h1 class="text-title-1 text-ink">{data.displayName}</h1>
			<p class="mt-1 text-subhead text-ink-secondary">{data.seasonLabel}</p>
		</div>
	</div>

	<SegmentedControl
		options={vistaOptions}
		bind:value={vista}
		label={m.competition_view_label()}
		onchange={setVista}
	/>
</header>

<div class="space-y-8">
	<section class="space-y-3">
		<SectionHeader title={m.competition_stats_scorers()} />
		<StatsScorersList scorers={data.scorers} />
	</section>

	<section class="space-y-3">
		<SectionHeader title={m.competition_stats_attack()} />
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<StatsExtremeCard variant="best" kind="attack" clubs={data.attack.best} />
			<StatsExtremeCard variant="worst" kind="attack" clubs={data.attack.worst} />
		</div>
	</section>

	<section class="space-y-3">
		<SectionHeader title={m.competition_stats_defense()} />
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<StatsExtremeCard variant="best" kind="defense" clubs={data.defense.best} />
			<StatsExtremeCard variant="worst" kind="defense" clubs={data.defense.worst} />
		</div>
	</section>
</div>
