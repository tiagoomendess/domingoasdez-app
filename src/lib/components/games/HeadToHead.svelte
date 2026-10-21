<script lang="ts">
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import type { Match } from '#lib/components/types.ts';
	import type { HeadToHeadStats } from '#lib/games.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		gameId: number;
		homeName: string;
		awayName: string;
		stats: HeadToHeadStats | null;
		pastGamesShown: Match[];
		total: number;
		/** Offset of the next page from the server; null when there's none (or for guests). */
		nextOffset: number | null;
		remainingCount: number;
		loginHref: string;
	};

	let {
		gameId,
		homeName,
		awayName,
		stats,
		pastGamesShown,
		total,
		nextOffset: initialOffset,
		remainingCount,
		loginHref
	}: Props = $props();

	let extra = $state.raw<Match[]>([]);
	/** `undefined` means "use the server offset"; set after the first page loads here. */
	let clientOffset = $state<number | null | undefined>(undefined);
	let loadingMore = $state(false);
	let failed = $state(false);

	const matches = $derived([...pastGamesShown, ...extra]);
	const nextOffset = $derived(clientOffset === undefined ? initialOffset : clientOffset);

	async function loadMore() {
		if (loadingMore || nextOffset == null) return;
		loadingMore = true;
		failed = false;
		try {
			const res = await fetch(`/api/jogos/${gameId}/anteriores?offset=${nextOffset}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const page = (await res.json()) as { matches: Match[]; nextOffset: number | null };
			extra = [...extra, ...page.matches];
			clientOffset = page.nextOffset;
		} catch {
			failed = true;
		} finally {
			loadingMore = false;
		}
	}

	function pct(value: number): string {
		return value.toLocaleString(undefined, {
			maximumFractionDigits: 2,
			minimumFractionDigits: 0
		});
	}
</script>

<section class="space-y-3">
	<SectionHeader title={m.game_h2h_title()} headingLevel={2} />

	{#if stats && stats.total > 0}
		<div class="overflow-hidden rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			<div
				class="flex h-2.5 overflow-hidden rounded-full"
				role="img"
				aria-label={m.game_h2h_title()}
			>
				{#if stats.homeWinPercent > 0}
					<span class="bg-danger" style:width="{stats.homeWinPercent}%"></span>
				{/if}
				{#if stats.drawPercent > 0}
					<span class="bg-fill-strong" style:width="{stats.drawPercent}%"></span>
				{/if}
				{#if stats.awayWinPercent > 0}
					<span class="bg-accent" style:width="{stats.awayWinPercent}%"></span>
				{/if}
			</div>

			<ul class="mt-3 space-y-1.5 text-footnote">
				<li class="flex items-center justify-between gap-3">
					<span class="flex items-center gap-2 text-ink-secondary">
						<span aria-hidden="true" class="size-2.5 rounded-full bg-danger"></span>
						{m.game_h2h_home_wins({ club: homeName })}
					</span>
					<span class="text-ink tabular-nums"
						>{stats.homeWins}
						<span class="text-ink-tertiary">({pct(stats.homeWinPercent)}%)</span></span
					>
				</li>
				<li class="flex items-center justify-between gap-3">
					<span class="flex items-center gap-2 text-ink-secondary">
						<span aria-hidden="true" class="size-2.5 rounded-full bg-fill-strong"></span>
						{m.game_h2h_draws()}
					</span>
					<span class="text-ink tabular-nums"
						>{stats.draws}
						<span class="text-ink-tertiary">({pct(stats.drawPercent)}%)</span></span
					>
				</li>
				<li class="flex items-center justify-between gap-3">
					<span class="flex items-center gap-2 text-ink-secondary">
						<span aria-hidden="true" class="size-2.5 rounded-full bg-accent"></span>
						{m.game_h2h_away_wins({ club: awayName })}
					</span>
					<span class="text-ink tabular-nums"
						>{stats.awayWins}
						<span class="text-ink-tertiary">({pct(stats.awayWinPercent)}%)</span></span
					>
				</li>
			</ul>
		</div>
	{/if}

	<div>
		<h3 class="mb-2 px-1 text-footnote font-semibold text-ink-secondary">{m.game_h2h_past()}</h3>

		{#if matches.length === 0}
			<div class="rounded-card bg-surface px-4 py-6 text-center ring-1 ring-line dark:ring-0">
				<p class="text-callout text-ink-secondary">{m.game_h2h_empty()}</p>
			</div>
		{:else}
			<div class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
				<ul>
					{#each matches as match (match.id)}
						<li class="match">
							<MatchRow {match} showDate />
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if nextOffset != null}
			<div class="mt-3 flex flex-col items-center gap-2 text-center">
				<p class="text-footnote text-ink-tertiary tabular-nums" aria-live="polite">
					{failed ? m.game_h2h_error() : m.game_h2h_count({ shown: matches.length, total })}
				</p>
				<Button variant="tinted" loading={loadingMore} onclick={loadMore}>
					{failed ? m.game_h2h_retry() : m.game_h2h_show_more()}
				</Button>
			</div>
		{/if}
	</div>

	{#if remainingCount > 0}
		<div
			class="flex flex-col items-center gap-3 rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line dark:ring-0"
		>
			<p class="text-callout text-ink-secondary">{m.game_h2h_more({ count: remainingCount })}</p>
			<Button href={loginHref} variant="tinted">{m.game_h2h_login()}</Button>
		</div>
	{/if}
</section>

<style>
	.match {
		position: relative;
	}

	.match:not(:first-child)::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 4.75rem;
		height: 1px;
		background-color: var(--line);
	}
</style>
