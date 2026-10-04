<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import type { AgentType } from '#lib/clubs.ts';
	import { formatMonthYear } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function agentTypeLabel(type: AgentType): string {
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

	function historySubtitle(teamName: string | null, type: AgentType): string {
		const role = agentTypeLabel(type);
		return teamName ? `${teamName} · ${role}` : role;
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

<div class="grid gap-6 lg:grid-cols-3">
	<section class="space-y-6 lg:col-span-2">
		<header
			class="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left"
		>
			<Avatar name={data.name} src={data.picture} size={128} />
			<div class="min-w-0 flex-1 space-y-2">
				<h1 class="text-title-1 wrap-break-word text-ink">{data.name}</h1>
				<span
					class="inline-flex h-6 items-center rounded-full bg-accent-tint px-2.5 text-caption font-semibold whitespace-nowrap text-accent-text"
				>
					{agentTypeLabel(data.agentType)}
				</span>
				{#if data.age != null}
					<p class="text-footnote text-ink-secondary">
						{m.player_age()}
						<span class="text-ink tabular-nums">{data.age}</span>
					</p>
				{/if}
			</div>
		</header>

		{#if data.club}
			{@const club = data.club}
			<ListGroup title={m.player_current_club()}>
				<ListRow title={club.name} subtitle={club.teamName} href={club.href}>
					{#snippet leading()}
						<Emblem src={club.emblem} name={club.name} size={40} plate={false} decorative />
					{/snippet}
				</ListRow>
			</ListGroup>
		{:else}
			<ListGroup title={m.player_current_club()}>
				<ListRow title={m.player_no_club()} />
			</ListGroup>
		{/if}

		{#if data.player}
			{@const player = data.player}
			<ListGroup title={m.agent_linked_player()}>
				<ListRow title={player.name} href={player.href}>
					{#snippet leading()}
						<Avatar name={player.name} src={player.picture} size={40} />
					{/snippet}
				</ListRow>
			</ListGroup>
		{/if}
	</section>

	<aside>
		{#if data.history.length > 0}
			<ListGroup title={m.player_history()}>
				{#each data.history as record (record.id)}
					{@const clubTitle = record.clubName ?? m.player_no_club()}
					<ListRow
						title={clubTitle}
						subtitle={historySubtitle(record.teamName, record.agentType)}
						value={formatMonthYear(record.startedAt)}
						href={record.href ?? undefined}
					>
						{#snippet leading()}
							<Emblem src={record.emblem} name={clubTitle} size={40} plate={false} decorative />
						{/snippet}
					</ListRow>
				{/each}
			</ListGroup>
		{:else}
			<section>
				<h2 class="mb-2 px-4 text-footnote font-semibold text-ink-secondary">
					{m.player_history()}
				</h2>
				<div class="rounded-card bg-surface px-4 py-6 text-center ring-1 ring-line dark:ring-0">
					<p class="text-callout text-ink-secondary">{m.agent_no_history()}</p>
				</div>
			</section>
		{/if}
	</aside>
</div>

{#if data.editHref}
	<div class="mt-6">
		<ListGroup title={m.agent_admin()}>
			<ListRow title={m.agent_admin_edit()} href={data.editHref} />
		</ListGroup>
	</div>
{/if}
