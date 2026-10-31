<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { m } from '#lib/messages.ts';
	import type { LeaderboardEntry, LeaderboardPeriod } from '#lib/server/prediction-leaderboard.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// `?periodo=` only picks the tab: every period is loaded at once, so switching never refetches.
	const PARAMS: Record<LeaderboardPeriod, string | null> = {
		week: null,
		month: '30d',
		allTime: 'sempre'
	};

	function periodFromUrl(url: {
		searchParams: { get(name: string): string | null };
	}): LeaderboardPeriod {
		const raw = url.searchParams.get('periodo');
		if (raw === PARAMS.month) return 'month';
		if (raw === PARAMS.allTime) return 'allTime';
		return 'week';
	}

	let period = $state<LeaderboardPeriod>(periodFromUrl(page.url));

	const periodOptions = $derived<{ value: LeaderboardPeriod; label: string }[]>([
		{ value: 'week', label: m.leaderboard_period_week() },
		{ value: 'month', label: m.leaderboard_period_month() },
		{ value: 'allTime', label: m.leaderboard_period_all() }
	]);

	const view = $derived(data.leaderboard[period]);

	function setPeriod(value: LeaderboardPeriod) {
		const url = new URL(page.url.href);
		const param = PARAMS[value];
		if (param) url.searchParams.set('periodo', param);
		else url.searchParams.delete('periodo');
		replaceState(url, {});
	}

	function stats(entry: LeaderboardEntry): string {
		return [
			m.leaderboard_exact({ count: entry.exact }),
			m.leaderboard_correct({ count: entry.correct }),
			m.leaderboard_total({ count: entry.total })
		].join(' · ');
	}
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
	<!-- Hidden until it's linked from the app. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="flex flex-col gap-4 px-1 pb-4">
	<div>
		<h1 class="text-large-title text-ink">{data.seo.title}</h1>
		<p class="mt-1 text-subhead text-ink-secondary">{m.leaderboard_rules()}</p>
	</div>
	<SegmentedControl
		options={periodOptions}
		bind:value={period}
		label={m.leaderboard_period_label()}
		onchange={setPeriod}
	/>
</header>

{#snippet row(entry: LeaderboardEntry)}
	<ListRow title={entry.name} subtitle={stats(entry)} highlighted={entry.userId === data.viewerId}>
		{#snippet leading()}
			<span class="flex items-center gap-3">
				<span
					class={[
						'flex size-8 items-center justify-center rounded-full text-headline tabular-nums',
						entry.position <= 3 ? 'bg-gold-400/45 text-ink' : 'text-ink-secondary'
					]}
				>
					<span class="sr-only">{m.leaderboard_position({ position: entry.position })}</span>
					<span aria-hidden="true">{entry.position}</span>
				</span>
				<Avatar name={entry.name} src={entry.picture} size={40} />
			</span>
		{/snippet}
		{#snippet trailing()}
			<span class="shrink-0 text-headline text-ink tabular-nums">
				{m.leaderboard_points({ count: entry.points })}
			</span>
		{/snippet}
	</ListRow>
{/snippet}

{#if view.entries.length === 0}
	<EmptyState
		icon={TrophyIcon}
		title={m.leaderboard_empty_title()}
		description={m.leaderboard_empty_text()}
	/>
{:else}
	<ListGroup>
		{#each view.entries as entry (entry.userId)}
			{@render row(entry)}
		{/each}
	</ListGroup>

	{#if view.me}
		<ListGroup title={m.leaderboard_you()} class="mt-6">
			{@render row(view.me)}
		</ListGroup>
	{/if}
{/if}
