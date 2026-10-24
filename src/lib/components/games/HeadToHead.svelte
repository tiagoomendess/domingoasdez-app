<script lang="ts">
	import PagedMatches from '#lib/components/games/PagedMatches.svelte';
	import ResultSplit from '#lib/components/games/ResultSplit.svelte';
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
		nextOffset,
		remainingCount,
		loginHref
	}: Props = $props();

	const items = $derived(pastGamesShown.map((match) => ({ match })));

	async function loadPage(offset: number) {
		const res = await fetch(`/api/jogos/${gameId}/anteriores?offset=${offset}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const page = (await res.json()) as { matches: Match[]; nextOffset: number | null };
		return { items: page.matches.map((match) => ({ match })), nextOffset: page.nextOffset };
	}
</script>

<section class="space-y-3">
	<SectionHeader title={m.game_h2h_title()} headingLevel={2} />

	{#if stats && stats.total > 0}
		<div class="overflow-hidden rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			<ResultSplit
				{...stats}
				homeLabel={m.game_h2h_home_wins({ club: homeName })}
				drawLabel={m.game_h2h_draws()}
				awayLabel={m.game_h2h_away_wins({ club: awayName })}
				label={m.game_h2h_title()}
			/>
		</div>
	{/if}

	<div>
		<h3 class="mb-2 px-1 text-footnote font-semibold text-ink-secondary">{m.game_h2h_past()}</h3>

		<PagedMatches
			{items}
			{total}
			{nextOffset}
			{loadPage}
			emptyText={m.game_h2h_empty()}
			{remainingCount}
			remainingText={m.game_h2h_more({ count: remainingCount })}
			{loginHref}
		/>
	</div>
</section>
