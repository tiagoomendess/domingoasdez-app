<script lang="ts">
	import SoccerBallIcon from 'phosphor-svelte/lib/SoccerBallIcon';
	import CalendarXIcon from 'phosphor-svelte/lib/CalendarXIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import DateRail from '#lib/components/games/DateRail.svelte';
	import MatchGroup from '#lib/components/games/MatchGroup.svelte';
	import { todayInLisbon } from '#lib/format.ts';
	import {
		competitions,
		sampleDayGroups,
		sampleDays,
		sampleLiveMatches,
		sampleMarkers
	} from '../sample-data.ts';

	let { oncalendar }: { oncalendar: () => void } = $props();

	const today = todayInLisbon();
	const days = sampleDays(today);
	const markers = sampleMarkers(today);
	const dayGroups = sampleDayGroups(today);

	let selected = $state(today);
	let live = $state(sampleLiveMatches(today));

	const isToday = $derived(selected === today);
	const hasGames = $derived(isToday || !!markers[selected]);

	function scoreGoal() {
		const match = live[0];
		if (Math.random() < 0.5) match.homeScore = (match.homeScore ?? 0) + 1;
		else match.awayScore = (match.awayScore ?? 0) + 1;
	}
</script>

<DesignSection
	id="jogos"
	title="Games"
	description="The day list and the live list merged. Live games sit on top (Today only) and never repeat below."
>
	<Specimen label="Date rail" note="Tap a date · calendar jumps far">
		<DateRail
			{days}
			{selected}
			{today}
			{markers}
			hrefFor={(day) => `?date=${day}`}
			onselect={(day, event) => {
				event.preventDefault();
				selected = day;
			}}
			{oncalendar}
		/>
	</Specimen>

	{#if !hasGames}
		<div class="rounded-card bg-surface ring-1 ring-line dark:ring-0">
			<EmptyState
				icon={CalendarXIcon}
				title="Sem jogos neste dia"
				description="O jogo mais próximo está marcado para hoje."
			>
				{#snippet action()}
					<Button variant="tinted" onclick={() => (selected = today)}>Voltar a hoje</Button>
				{/snippet}
			</EmptyState>
		</div>
	{:else}
		{#if isToday}
			<div class="space-y-3">
				<SectionHeader title="A decorrer" live count={live.length} headingLevel={3} />
				<MatchGroup
					name={competitions[0].name}
					subtitle="Época 2026/27 · Jornada 5"
					emblem={competitions[0].emblem}
					href="#jogos"
					matches={live}
				/>
				<Button variant="tinted" icon={SoccerBallIcon} onclick={scoreGoal}>Simular golo</Button>
			</div>
		{/if}

		<div class="space-y-3">
			<SectionHeader title="Jogos do dia" headingLevel={3} />
			{#each dayGroups as group (group.competition.id)}
				<MatchGroup
					name={group.competition.name}
					subtitle={group.subtitle}
					emblem={group.competition.emblem}
					href="#jogos"
					matches={group.matches}
				/>
			{/each}
		</div>
	{/if}
</DesignSection>
