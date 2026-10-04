<script lang="ts">
	import { page } from '$app/state';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { formatMonthYear } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const loginHref = $derived(`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname)}`);

	const positionLabel = $derived.by(() => {
		switch (data.position) {
			case 'striker':
				return m.player_position_striker();
			case 'midfielder':
				return m.player_position_midfielder();
			case 'defender':
				return m.player_position_defender();
			case 'goalkeeper':
				return m.player_position_goalkeeper();
			default:
				return null;
		}
	});

	const ageDisplay = $derived(
		data.age != null ? m.player_age_years({ age: data.age }) : m.player_age_unknown()
	);
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
		<header class="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
			<Avatar name={data.name} src={data.picture} size={128} />
			<div class="min-w-0 flex-1 space-y-2">
				<h1 class="text-title-1 text-ink wrap-break-word">{data.name}</h1>
				{#if data.nickname}
					<p class="text-callout text-ink-secondary">
						<span class="sr-only">{m.player_nickname()}: </span>
						{data.nickname}
					</p>
				{/if}
				{#if positionLabel}
					<span
						class="inline-flex h-6 items-center rounded-full bg-accent-tint px-2.5 text-caption font-semibold whitespace-nowrap text-accent-text"
					>
						<span class="sr-only">{m.player_position()}: </span>
						{positionLabel}
					</span>
				{/if}
			</div>
		</header>

		<div class="grid grid-cols-3 overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
			<div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
				<span class="text-title-2 text-ink tabular-nums">{ageDisplay}</span>
				<span class="text-footnote text-ink-secondary">{m.player_age()}</span>
			</div>
			<div
				class="flex flex-col items-center gap-1 border-x border-line px-2 py-4 text-center dark:border-white/10"
			>
				<span class="text-title-2 text-ink tabular-nums">{data.goals}</span>
				<span class="text-footnote text-ink-secondary">{m.player_goals()}</span>
			</div>
			<div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
				<span class="text-title-2 text-ink tabular-nums">{data.mvpVotes}</span>
				<span class="text-footnote text-ink-secondary">{m.player_mvp_votes()}</span>
			</div>
		</div>

		{#if data.club}
			{@const club = data.club}
			<ListGroup title={m.player_current_club()}>
				<ListRow title={club.name} subtitle={club.teamName} href={club.href}>
					{#snippet leading()}
						<Emblem src={club.emblem} name={club.name} size={40} decorative />
					{/snippet}
				</ListRow>
			</ListGroup>
		{:else}
			<ListGroup title={m.player_current_club()}>
				<ListRow title={m.player_no_club()} />
			</ListGroup>
		{/if}
	</section>

	<aside class="space-y-4">
		{#if data.transfers.length > 0}
			<ListGroup title={m.player_history()}>
				{#each data.transfers as transfer (transfer.id)}
					{@const clubTitle = transfer.clubName ?? m.player_no_club()}
					<ListRow
						title={clubTitle}
						subtitle={transfer.teamName ?? undefined}
						value={formatMonthYear(transfer.date)}
						href={transfer.href ?? undefined}
					>
						{#snippet leading()}
							<Emblem
								src={transfer.emblem}
								name={clubTitle}
								size={40}
								decorative
							/>
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
					<p class="text-callout text-ink-secondary">{m.player_no_transfers()}</p>
				</div>
			</section>
		{/if}

		{#if data.remainingTransfers > 0}
			<div
				class="flex flex-col items-center gap-3 rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line dark:ring-0"
			>
				<p class="text-callout text-ink-secondary">
					{m.player_more_transfers({ count: data.remainingTransfers })}
				</p>
				<Button href={loginHref} variant="tinted">{m.account_login()}</Button>
			</div>
		{/if}
	</aside>
</div>

{#if data.editHref}
	<div class="mt-6">
		<ListGroup title={m.player_admin()}>
			<ListRow title={m.player_admin_edit()} href={data.editHref} />
		</ListGroup>
	</div>
{/if}
