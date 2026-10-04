<script lang="ts">
	import { goto } from '$app/navigation';
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import MapPinIcon from 'phosphor-svelte/lib/MapPinIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';
	import DirectionsSheet from '#lib/components/games/DirectionsSheet.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Chip from '#lib/components/ui/Chip.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { formatArticleDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let directionsOpen = $state(false);
	let selectedTeamId = $derived(data.selectedTeamId);

	const activeTeam = $derived(
		data.teams.find((team) => team.id === selectedTeamId) ?? data.teams[0] ?? null
	);

	const teamPickerValue = $derived(selectedTeamId != null ? String(selectedTeamId) : '');

	const teamOptions = $derived(
		data.teams.map((team) => ({ value: String(team.id), label: team.name }))
	);

	const showAdmin = $derived(!!(data.editClubHref || activeTeam?.editHref));

	function agentTypeLabel(type: string): string {
		switch (type) {
			case 'manager':
				return m.club_agent_manager();
			case 'assistant_manager':
				return m.club_agent_assistant_manager();
			case 'goalkeeper_manager':
				return m.club_agent_goalkeeper_manager();
			case 'director':
				return m.club_agent_director();
			default:
				return type;
		}
	}

	function selectTeam(id: number) {
		if (id === selectedTeamId) return;
		selectedTeamId = id;
		const url = new URL(window.location.href);
		url.searchParams.set('equipa', String(id));
		void goto(`${url.pathname}${url.search}`, { replace: true, reset: false });
	}

	function onTeamPickerChange(value: string) {
		const id = Number.parseInt(value, 10);
		if (Number.isFinite(id)) selectTeam(id);
	}
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
	<meta property="og:title" content={data.seo.ogTitle} />
	{#if data.seo.ogImage}
		<meta property="og:image" content={data.seo.ogImage} />
	{/if}
</svelte:head>

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
			class="absolute top-3 left-3 z-10 inline-flex min-h-9 max-w-[min(100%-1.5rem,18rem)] items-center gap-1.5 rounded-full bg-black/55 px-3 text-footnote font-medium text-white ring-1 ring-white/15 backdrop-blur-sm hover:bg-black/65"
			aria-label={m.club_stadium()}
			onclick={() => (directionsOpen = true)}
		>
			<MapPinIcon size={16} weight="bold" class="shrink-0" />
			<span class="truncate">{data.venue.name}</span>
		</button>
	{/if}
	<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pt-12">
		<div class="flex items-center gap-3 px-4 pt-1 pb-3">
			<Emblem src={data.emblem} name={data.name} size={72} decorative />
			<h1 class="min-w-0 flex-1 truncate text-title-1 text-white">{data.name}</h1>
		</div>
	</div>
</div>

<div class="mt-6 grid gap-6 lg:grid-cols-3">
	<section class="space-y-4 lg:col-span-2">
		<SectionHeader title={m.club_teams()} />

		{#if data.teams.length === 0}
			<EmptyState icon={UsersThreeIcon} title={m.club_no_teams()} />
		{:else}
			{#if data.teams.length >= 2 && data.teams.length <= 3}
				<SegmentedControl
					options={teamOptions}
					value={teamPickerValue}
					label={m.club_team_picker_label()}
					onchange={onTeamPickerChange}
				/>
			{:else if data.teams.length > 3}
				<div role="group" aria-label={m.club_team_picker_label()} class="-mx-4 rail px-4 py-1">
					{#each data.teams as team (team.id)}
						<Chip selected={team.id === selectedTeamId} onclick={() => selectTeam(team.id)}>
							{team.name}
						</Chip>
					{/each}
				</div>
			{/if}

			{#if activeTeam}
				{#if activeTeam.agents.length > 0}
					<ListGroup title={m.club_staff()} headingLevel={3}>
						{#each activeTeam.agents as agent (agent.id)}
							<ListRow
								title={agent.name}
								subtitle={agentTypeLabel(agent.agentType)}
								href={agent.href}
							>
								{#snippet leading()}
									<Avatar name={agent.name} src={agent.picture} size={40} />
								{/snippet}
							</ListRow>
						{/each}
					</ListGroup>
				{:else}
					<p class="px-1 text-center text-callout text-ink-secondary">
						{m.club_no_staff({ team: activeTeam.name })}
					</p>
				{/if}

				<h3 class="px-1 text-footnote font-semibold text-ink-secondary">{m.club_players()}</h3>
				{#if activeTeam.players.length > 0}
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
						{#each activeTeam.players as player (player.id)}
							<a
								href={player.href}
								class="flex min-h-11 pressable flex-col items-center gap-2 rounded-inner p-2 text-center"
							>
								<Avatar name={player.name} src={player.picture} size={72} />
								<span class="line-clamp-2 w-full text-caption text-ink">{player.name}</span>
							</a>
						{/each}
					</div>
				{:else}
					<p class="px-1 text-center text-callout text-ink-secondary">
						{m.club_no_players({ team: activeTeam.name })}
					</p>
				{/if}
			{/if}
		{/if}
	</section>

	<aside class="space-y-4">
		{#if data.transfers.length > 0}
			<ListGroup title={m.club_transfers()}>
				{#each data.transfers as transfer (transfer.id)}
					<ListRow
						title={transfer.playerName}
						subtitle={`${transfer.teamName ?? m.club_transfer_no_team()} · ${formatArticleDate(transfer.date)}`}
						href={transfer.href}
					>
						{#snippet leading()}
							<Avatar name={transfer.playerName} src={transfer.picture} size={40} />
						{/snippet}
						{#snippet trailing()}
							{#if transfer.direction === 'in'}
								<span class="text-success">
									<ArrowLeftIcon size={20} weight="bold" aria-hidden="true" />
									<span class="sr-only">{m.club_transfer_in()}</span>
								</span>
							{:else}
								<span class="text-danger">
									<ArrowRightIcon size={20} weight="bold" aria-hidden="true" />
									<span class="sr-only">{m.club_transfer_out()}</span>
								</span>
							{/if}
						{/snippet}
					</ListRow>
				{/each}
			</ListGroup>
		{:else}
			<section>
				<h2 class="mb-2 px-4 text-footnote font-semibold text-ink-secondary">
					{m.club_transfers()}
				</h2>
				<div class="rounded-card bg-surface px-4 py-6 text-center ring-1 ring-line dark:ring-0">
					<p class="text-callout text-ink-secondary">{m.club_no_transfers()}</p>
				</div>
			</section>
		{/if}
	</aside>
</div>

{#if showAdmin}
	<div class="mt-6">
		<ListGroup title={m.club_admin()}>
			{#if data.editClubHref}
				<ListRow title={m.club_admin_edit_club()} href={data.editClubHref} />
			{/if}
			{#if activeTeam?.editHref}
				<ListRow
					title={m.club_admin_edit_team({ team: activeTeam.name })}
					href={activeTeam.editHref}
				/>
			{/if}
		</ListGroup>
	</div>
{/if}

{#if data.venue}
	<DirectionsSheet bind:open={directionsOpen} venue={data.venue} />
{/if}
