<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { createSubscriber } from 'svelte/reactivity';
	import MapPinIcon from 'phosphor-svelte/lib/MapPinIcon';
	import DirectionsSheet from '#lib/components/games/DirectionsSheet.svelte';
	import GameScoreboard from '#lib/components/games/GameScoreboard.svelte';
	import GoalList from '#lib/components/games/GoalList.svelte';
	import HeadToHead from '#lib/components/games/HeadToHead.svelte';
	import MvpVoteSheet from '#lib/components/games/MvpVoteSheet.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	const LIVE_REFRESH_MS = 30_000;

	let { data }: PageProps = $props();

	const user = $derived(page.data.user);
	const loginHref = $derived(`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname)}`);

	let directionsOpen = $state(false);
	let mvpOpen = $state(false);
	let pageVisible = $state(
		typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
	);

	const hasAdminLinks = $derived(
		!!(
			data.links.editGame ||
			data.links.addHomeGoal ||
			data.links.addAwayGoal ||
			data.links.scoreReportsList
		)
	);

	const showMvpVote = $derived(
		data.mvp.voteOpen &&
			!data.mvp.userVote &&
			data.mvp.homePlayers.length + data.mvp.awayPlayers.length > 0
	);

	const subscribeLiveRefresh = createSubscriber(() => {
		const id = setInterval(() => {
			void invalidate('app:game');
		}, LIVE_REFRESH_MS);
		return () => clearInterval(id);
	});

	const livePolling = $derived.by(() => {
		const active = (data.status === 'warmup' || data.status === 'live') && pageVisible;
		if (active) subscribeLiveRefresh();
		return active;
	});

	function onkickoff() {
		void invalidate('app:game');
	}

	function refereeTypeLabel(typeKey: string): string {
		switch (typeKey.toLowerCase().trim()) {
			case 'main':
			case 'principal':
			case 'referee':
			case 'árbitro':
			case 'arbitro':
				return m.game_referee_main();
			case 'assistant':
			case 'assistente':
			case 'assistant referee':
				return m.game_referee_assistant();
			case 'fourth_official':
			case 'fourth official':
			case 'quarto árbitro':
			case 'quarto arbitro':
				return m.game_referee_fourth_official();
			case 'goal_line':
			case 'goal-line':
			case 'goal line':
			case 'árbitro de baliza':
			case 'arbitro de baliza':
				return m.game_referee_goal_line();
			case 'var':
				return m.game_referee_var();
			case 'var_assistant':
			case 'var assistant':
			case 'assistente var':
				return m.game_referee_var_assistant();
			default:
				return typeKey;
		}
	}
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
	{#if data.seo.ogImage}
		<meta property="og:image" content={data.seo.ogImage} />
	{/if}
</svelte:head>

<svelte:document
	onvisibilitychange={() => {
		pageVisible = document.visibilityState === 'visible';
	}}
/>

<div class="space-y-6" data-live-polling={livePolling || undefined}>
	<div class="relative overflow-hidden rounded-card">
		<img
			src={data.coverPicture}
			alt=""
			width="1280"
			height="720"
			class="aspect-video w-full object-cover"
			decoding="async"
		/>
		{#if data.venue}
			<button
				type="button"
				class="absolute top-3 left-3 z-10 inline-flex max-w-[min(100%-1.5rem,18rem)] min-h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-footnote font-medium text-white backdrop-blur-sm ring-1 ring-white/15 hover:bg-black/65"
				onclick={() => (directionsOpen = true)}
			>
				<MapPinIcon size={16} weight="bold" class="shrink-0" />
				<span class="truncate">{data.venue.name}</span>
			</button>
		{/if}
		<div
			class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pt-12"
		>
			<a href={data.competitionHref} class="flex items-center gap-3 px-4 pb-3 pt-1">
				<Emblem src={data.displayEmblem} name={data.displayName} size={24} decorative />
				<span class="min-w-0 flex-1">
					<span class="block truncate text-headline text-white">{data.displayName}</span>
					<span class="block truncate text-footnote text-white/70">
						{m.game_round_group({ group: data.groupName, round: data.round })}
					</span>
				</span>
			</a>
		</div>
	</div>

	<GameScoreboard
		home={data.home}
		away={data.away}
		kickoff={data.kickoff}
		status={data.status}
		showScore={data.showScore}
		homeScore={data.homeScore}
		awayScore={data.awayScore}
		penalties={data.penalties}
		homeForm={data.homeForm}
		awayForm={data.awayForm}
		mvpWinner={data.mvp.winner}
		scoreReportHref={data.links.scoreReport}
		{onkickoff}
	/>

	{#if showMvpVote || data.mvp.userVote || data.links.flashInterview}
		<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
			{#if data.mvp.userVote}
				<div
					class="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-fill px-4 text-subhead text-ink"
				>
					<Avatar name={data.mvp.userVote.name} src={data.mvp.userVote.picture} size={28} />
					<span class="min-w-0 truncate">{m.game_mvp_voted({ name: data.mvp.userVote.name })}</span>
				</div>
			{:else if showMvpVote}
				{#if user}
					<Button variant="tinted" full class="sm:flex-1" onclick={() => (mvpOpen = true)}>
						{m.game_mvp_vote()}
					</Button>
				{:else}
					<Button href={loginHref} variant="tinted" full class="sm:flex-1">
						{m.game_mvp_vote_login()}
					</Button>
				{/if}
			{/if}

			{#if data.links.flashInterview}
				<Button href={data.links.flashInterview} variant="outline" full class="sm:flex-1">
					{m.game_flash_interview()}
				</Button>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-3">
		<GoalList
			title={m.game_goals_from({ club: data.home.name })}
			goals={data.homeGoals}
			addGoalHref={data.links.addHomeGoal}
			addGoalLabel={data.links.addHomeGoal ? m.game_admin_add_home_goal() : null}
		/>

		{#if data.referees.length > 0}
			<ListGroup title={m.game_referees()} headingLevel={3}>
				{#each data.referees as referee (referee.id)}
					<ListRow
						title={referee.name}
						subtitle={refereeTypeLabel(referee.typeKey)}
						href={referee.href}
					>
						{#snippet leading()}
							<Avatar name={referee.name} src={referee.picture} size={40} />
						{/snippet}
					</ListRow>
				{/each}
			</ListGroup>
		{:else}
			<section>
				<h3 class="mb-2 px-4 text-footnote font-semibold text-ink-secondary">
					{m.game_referees()}
				</h3>
				<div class="rounded-card bg-surface px-4 py-6 text-center ring-1 ring-line dark:ring-0">
					<p class="text-callout text-ink-secondary">{m.game_no_referees()}</p>
				</div>
			</section>
		{/if}

		<GoalList
			title={m.game_goals_from({ club: data.away.name })}
			goals={data.awayGoals}
			addGoalHref={data.links.addAwayGoal}
			addGoalLabel={data.links.addAwayGoal ? m.game_admin_add_away_goal() : null}
		/>
	</div>

	<HeadToHead
		homeName={data.home.name}
		awayName={data.away.name}
		stats={data.h2hStats}
		pastGamesShown={data.pastGamesShown}
		remainingCount={data.remainingPastGamesCount}
		{loginHref}
	/>

	{#if hasAdminLinks}
		<ListGroup title={m.game_admin()} headingLevel={2}>
			{#if data.links.editGame}
				<ListRow title={m.game_admin_edit()} href={data.links.editGame} />
			{/if}
			{#if data.links.addHomeGoal}
				<ListRow title={m.game_admin_add_home_goal()} href={data.links.addHomeGoal} />
			{/if}
			{#if data.links.addAwayGoal}
				<ListRow title={m.game_admin_add_away_goal()} href={data.links.addAwayGoal} />
			{/if}
			{#if data.links.scoreReportsList}
				<ListRow title={m.game_admin_score_reports()} href={data.links.scoreReportsList} />
			{/if}
		</ListGroup>
	{/if}
</div>

<DirectionsSheet bind:open={directionsOpen} venue={data.venue} />

{#if showMvpVote && user}
	<MvpVoteSheet
		bind:open={mvpOpen}
		gameId={data.id}
		homeName={data.home.name}
		awayName={data.away.name}
		homePlayers={data.mvp.homePlayers}
		awayPlayers={data.mvp.awayPlayers}
	/>
{/if}
