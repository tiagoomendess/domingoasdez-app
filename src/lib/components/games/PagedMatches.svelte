<script lang="ts">
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import type { Match } from '#lib/components/types.ts';
	import { m } from '#lib/messages.ts';
	import { seasonBreaks } from '#lib/playgrounds.ts';

	type Item = {
		match: Match;
		/** Quiet line under the teams (the competition, in lists that mix them). */
		caption?: string | null;
		/** `2025/26`: with `seasonHeaders`, a header goes above the first game of each season. */
		season?: string | null;
	};

	type Props = {
		/** The first page, from the page load. */
		items: Item[];
		total: number;
		/** Offset of the next page from the server; null when there's none (or for guests). */
		nextOffset: number | null;
		/** Fetches a later page ("Ver mais"), without a navigation. */
		loadPage: (offset: number) => Promise<{ items: Item[]; nextOffset: number | null }>;
		emptyText: string;
		/** Games kept behind the login prompt (guests). */
		remainingCount?: number;
		remainingText?: string;
		loginHref: string;
		seasonHeaders?: boolean;
	};

	let {
		items: firstPage,
		total,
		nextOffset: initialOffset,
		loadPage,
		emptyText,
		remainingCount = 0,
		remainingText = '',
		loginHref,
		seasonHeaders = false
	}: Props = $props();

	let extra = $state.raw<Item[]>([]);
	/** `undefined` means "use the server offset"; set after the first page loads here. */
	let clientOffset = $state<number | null | undefined>(undefined);
	let loadingMore = $state(false);
	let failed = $state(false);

	const items = $derived([...firstPage, ...extra]);
	const nextOffset = $derived(clientOffset === undefined ? initialOffset : clientOffset);
	// Over the whole list, so a season carrying over into an appended page keeps one header.
	const breaks = $derived(
		seasonHeaders ? seasonBreaks(items.map((i) => ({ season: i.season ?? '' }))) : new Set<number>()
	);

	async function loadMore() {
		if (loadingMore || nextOffset == null) return;
		loadingMore = true;
		failed = false;
		try {
			const page = await loadPage(nextOffset);
			extra = [...extra, ...page.items];
			clientOffset = page.nextOffset;
		} catch {
			failed = true;
		} finally {
			loadingMore = false;
		}
	}
</script>

{#if items.length === 0}
	<div class="rounded-card bg-surface px-4 py-6 text-center ring-1 ring-line dark:ring-0">
		<p class="text-callout text-ink-secondary">{emptyText}</p>
	</div>
{:else}
	<div class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
		<ul>
			{#each items as item, i (item.match.id)}
				{#if breaks.has(i)}
					<li
						class={[
							'px-4 pt-3 pb-1 text-footnote font-semibold text-ink-secondary',
							i > 0 && 'border-t border-line'
						]}
					>
						{m.paged_matches_season({ season: item.season ?? '' })}
					</li>
				{/if}
				<li class={['match', breaks.has(i) && 'first-of-season']}>
					<MatchRow match={item.match} caption={item.caption} showDate />
				</li>
			{/each}
		</ul>
	</div>
{/if}

{#if nextOffset != null}
	<div class="mt-3 flex flex-col items-center gap-2 text-center">
		<p class="text-footnote text-ink-tertiary tabular-nums" aria-live="polite">
			{failed ? m.game_h2h_error() : m.game_h2h_count({ shown: items.length, total })}
		</p>
		<Button variant="tinted" loading={loadingMore} onclick={loadMore}>
			{failed ? m.game_h2h_retry() : m.game_h2h_show_more()}
		</Button>
	</div>
{/if}

{#if remainingCount > 0}
	<div
		class="mt-3 flex flex-col items-center gap-3 rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line dark:ring-0"
	>
		<p class="text-callout text-ink-secondary">{remainingText}</p>
		<Button href={loginHref} variant="tinted">{m.game_h2h_login()}</Button>
	</div>
{/if}

<style>
	.match {
		position: relative;
	}

	.match:not(:first-child):not(.first-of-season)::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 4.75rem;
		height: 1px;
		background-color: var(--line);
	}
</style>
