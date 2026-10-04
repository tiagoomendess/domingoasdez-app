<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
	import RoundNavigator from '#lib/components/competitions/RoundNavigator.svelte';
	import SeasonSheet from '#lib/components/competitions/SeasonSheet.svelte';
	import StandingsLegend from '#lib/components/competitions/StandingsLegend.svelte';
	import StandingsTable from '#lib/components/competitions/StandingsTable.svelte';
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { m } from '#lib/messages.ts';
	import {
		buildStandings,
		defaultRound,
		roundLabelKey,
		zonesFor,
		type RoundLabelKey,
		type StandingsGroup
	} from '#lib/standings.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Vista = 'jogos' | 'classificacao' | 'estatisticas';
	type Group = (typeof data.groups)[number];

	function defaultRounds(groups: Group[]): Record<number, number> {
		const next: Record<number, number> = {};
		for (const group of groups) {
			const chosen = defaultRound(group.standingsGroup as StandingsGroup);
			if (chosen != null) next[group.id] = chosen;
		}
		return next;
	}

	let seasonSheetOpen = $state(false);
	let selectedRounds = $state<Record<number, number>>(
		untrack(() => defaultRounds(data.groups))
	);
	let seededSeasonId = untrack(() => data.seasonId);
	let vista = $state<Vista>(untrack(() => data.vista as Vista));

	$effect(() => {
		const seasonId = data.seasonId;
		const groups = data.groups;
		if (seasonId !== seededSeasonId) {
			seededSeasonId = seasonId;
			selectedRounds = defaultRounds(groups);
		}
	});

	$effect(() => {
		vista = data.vista as Vista;
	});

	const hasPointsGroup = $derived(data.groups.some((g) => g.rules.type === 'points'));

	const vistaOptions = $derived.by(() => {
		const options: { value: Vista; label: string }[] = [
			{ value: 'jogos', label: m.competition_view_games() }
		];
		if (hasPointsGroup) {
			options.push({ value: 'classificacao', label: m.competition_view_standings() });
		}
		options.push({ value: 'estatisticas', label: m.competition_view_stats() });
		return options;
	});

	const seasonIndex = $derived(data.seasons.findIndex((s) => s.id === data.seasonId));
	// seasons are newest → oldest; "prev" = older = higher index, "next" = newer = lower index
	const olderSeason = $derived(
		seasonIndex >= 0 && seasonIndex < data.seasons.length - 1
			? data.seasons[seasonIndex + 1]
			: null
	);
	const newerSeason = $derived(seasonIndex > 0 ? data.seasons[seasonIndex - 1] : null);

	function roundLabel(key: RoundLabelKey, number: number): string {
		switch (key) {
			case 'round_matchday':
				return m.round_matchday({ number });
			case 'round_cup_tie':
				return m.round_cup_tie({ number });
			case 'round_friendlies':
				return m.round_friendlies({ number });
			case 'round_week':
				return m.round_week({ number });
		}
	}

	function setVista(value: Vista) {
		if (value === 'estatisticas') {
			void goto(data.statsHref, { replace: true, reset: false });
			return;
		}
		vista = value;
		const url = new URL(window.location.href);
		if (value === 'jogos') url.searchParams.delete('vista');
		else url.searchParams.set('vista', value);
		void goto(`${url.pathname}${url.search}`, { replace: true, reset: false });
	}

	function roundNumbers(groupId: number): number[] {
		const group = data.groups.find((g) => g.id === groupId);
		if (!group) return [];
		return group.rounds.map((r) => r.number).sort((a, b) => a - b);
	}

	function shiftRound(groupId: number, delta: number) {
		const numbers = roundNumbers(groupId);
		const current = selectedRounds[groupId] ?? numbers[0];
		const idx = numbers.indexOf(current);
		if (idx < 0) return;
		const next = numbers[idx + delta];
		if (next == null) return;
		selectedRounds = { ...selectedRounds, [groupId]: next };
	}

	function currentRoundGames(groupId: number) {
		const group = data.groups.find((g) => g.id === groupId);
		if (!group) return [];
		const round = selectedRounds[groupId];
		return group.rounds.find((r) => r.number === round)?.games ?? [];
	}
</script>

<svelte:head>
	<title>{data.displayName} · {m.feed_brand()}</title>
	<meta
		name="description"
		content={m.competition_meta_description({
			name: data.displayName,
			season: data.seasonLabel
		})}
	/>
</svelte:head>

<header class="flex flex-col gap-4 px-1 pb-4">
	<div class="flex items-start gap-4">
		<Emblem src={data.emblem} name={data.displayName} size={72} shape="rounded" decorative />
		<div class="min-w-0 flex-1 pt-1">
			<h1 class="text-title-1 text-ink">{data.displayName}</h1>
			<div class="mt-2 flex items-center gap-1">
				{#if olderSeason}
					<IconButton
						label={m.competition_season_prev()}
						variant="fill"
						href={olderSeason.href}
						class="!size-9"
					>
						<CaretLeftIcon size={18} weight="bold" />
					</IconButton>
				{:else}
					<IconButton label={m.competition_season_prev()} variant="fill" disabled class="!size-9">
						<CaretLeftIcon size={18} weight="bold" />
					</IconButton>
				{/if}
				<button
					type="button"
					class="min-h-9 rounded-full px-3 text-subhead font-semibold text-accent-text hover:bg-accent-tint"
					onclick={() => (seasonSheetOpen = true)}
				>
					{data.seasonLabel}
				</button>
				{#if newerSeason}
					<IconButton
						label={m.competition_season_next()}
						variant="fill"
						href={newerSeason.href}
						class="!size-9"
					>
						<CaretRightIcon size={18} weight="bold" />
					</IconButton>
				{:else}
					<IconButton label={m.competition_season_next()} variant="fill" disabled class="!size-9">
						<CaretRightIcon size={18} weight="bold" />
					</IconButton>
				{/if}
			</div>
		</div>
	</div>

	{#if vistaOptions.length > 1}
		<SegmentedControl
			options={vistaOptions}
			bind:value={vista}
			label={m.competition_view_label()}
			onchange={setVista}
		/>
	{/if}
</header>

{#if vista === 'jogos' && data.hasLiveGames}
	<aside
		class="mb-6 flex gap-3 rounded-card bg-live-tint px-4 py-3 text-callout text-ink"
		role="status"
	>
		<WarningCircleIcon size={20} weight="fill" class="mt-0.5 shrink-0 text-live" />
		<p>
			{m.competition_live_warning()}
			<a href="/jogos" class="font-semibold text-accent-text underline-offset-2 hover:underline">
				{m.competition_live_link()}
			</a>
		</p>
	</aside>
{/if}

{#if data.groups.length === 0}
	<EmptyState
		icon={TrophyIcon}
		title={m.competition_empty_title()}
		description={m.competition_empty_text()}
	/>
{:else}
	<div class="space-y-6">
		{#each data.groups as group (group.id)}
			{@const numbers = roundNumbers(group.id)}
			{@const current = selectedRounds[group.id] ?? numbers[0]}
			{@const currentIdx = numbers.indexOf(current)}
			<section class="space-y-3">
				{#if data.groups.length > 1 || group.name !== data.displayName}
					<h2 class="px-1 text-title-3 text-ink">{group.name}</h2>
				{/if}

				{#if numbers.length === 0}
					<p class="px-1 text-callout text-ink-secondary">{m.competition_group_empty()}</p>
				{:else}
					<div class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
						<RoundNavigator
							label={roundLabel(roundLabelKey(group.rules.type), current)}
							hasPrev={currentIdx > 0}
							hasNext={currentIdx >= 0 && currentIdx < numbers.length - 1}
							onprev={() => shiftRound(group.id, -1)}
							onnext={() => shiftRound(group.id, 1)}
						/>

						{#if vista === 'jogos'}
							<ul>
								{#each currentRoundGames(group.id) as game (game.match.id)}
									<li class="match">
										<MatchRow match={game.match} showDate />
									</li>
								{/each}
							</ul>
						{:else if group.rules.type === 'points'}
							{@const table = buildStandings(group.standingsGroup, current)}
							{@const { rows: zoneRows, legend } = zonesFor(group.standingsGroup, table)}
							<div class="px-1 pb-3">
								<StandingsTable rows={table} zones={zoneRows} />
								<StandingsLegend items={legend} />
							</div>
						{:else}
							<p class="px-4 py-6 text-center text-callout text-ink-secondary">
								{m.competition_no_standings()}
							</p>
						{/if}
					</div>
				{/if}
			</section>
		{/each}
	</div>
{/if}

{#if data.obs?.trim()}
	<p class="mt-6 px-1 text-footnote text-ink-tertiary">{data.obs}</p>
{/if}

<SeasonSheet bind:open={seasonSheetOpen} seasons={data.seasons} currentId={data.seasonId} />

<style>
	.match {
		position: relative;
	}

	.match::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 4.75rem;
		height: 1px;
		background-color: var(--line);
	}
</style>
