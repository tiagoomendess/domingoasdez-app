<script lang="ts">
	import { page } from '$app/state';
	import DirectionsButtons from '#lib/components/games/DirectionsButtons.svelte';
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import PagedMatches from '#lib/components/games/PagedMatches.svelte';
	import ResultSplit from '#lib/components/games/ResultSplit.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import VenueMap from '#lib/components/venue/VenueMap.svelte';
	import { formatMonthYear } from '#lib/format.ts';
	import { getLocale, m } from '#lib/messages.ts';
	import type { PlaygroundGameItem, PlaygroundGamesPage } from '#lib/playgrounds.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const loginHref = $derived(`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname)}`);

	function caption(item: PlaygroundGameItem): string {
		return m.game_round_group({ group: item.competition, round: item.round });
	}

	const gameItems = $derived(data.games.items.map((item) => ({ ...item, caption: caption(item) })));

	async function loadPage(offset: number) {
		const res = await fetch(`/api/campos/${data.id}/jogos?offset=${offset}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const next = (await res.json()) as PlaygroundGamesPage;
		return {
			items: next.items.map((item) => ({ ...item, caption: caption(item) })),
			nextOffset: next.nextOffset
		};
	}

	function formatNumber(value: number, fractionDigits = 0): string {
		return new Intl.NumberFormat(getLocale(), {
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits
		}).format(value);
	}

	const hasDetails = $derived(
		!!data.surface || !!data.dimensions || data.capacity != null || !!data.club
	);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
	<meta property="og:title" content={data.seo.ogTitle} />
	<meta property="og:image" content={data.seo.ogImage} />
</svelte:head>

<div class="space-y-6">
	<header class="min-w-0 space-y-4">
		<img
			src={data.picture}
			alt=""
			width="1280"
			height="720"
			class="aspect-video w-full rounded-card bg-fill object-cover"
			decoding="async"
		/>
		<div class="space-y-2 px-1">
			<h1 class="text-title-1 wrap-break-word text-ink">{data.name}</h1>
			{#if data.club || data.surface}
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					{#if data.club}
						<a
							href={data.club.href}
							class="inline-flex min-h-11 items-center gap-2 text-subhead font-medium text-ink hover:underline"
						>
							<Emblem
								src={data.club.emblem}
								name={data.club.name}
								size={24}
								plate={false}
								decorative
							/>
							{data.club.name}
						</a>
					{/if}
					{#if data.surface}
						<span
							class="inline-flex h-6 items-center rounded-full bg-fill px-2.5 text-caption font-semibold whitespace-nowrap text-ink-secondary"
						>
							{data.surface}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<section class="min-w-0 space-y-3">
		{#if data.upcoming}
			{@const upcoming = data.upcoming}
			<SectionHeader
				title={upcoming.live ? m.playground_live() : m.playground_next_game()}
				live={upcoming.live}
			/>
			<div class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
				<MatchRow match={upcoming.item.match} caption={caption(upcoming.item)} showDate />
			</div>
		{:else}
			<SectionHeader title={m.playground_next_game()} />
			<div class="rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line dark:ring-0">
				<p class="text-callout text-ink-secondary">{m.playground_no_next_game()}</p>
			</div>
		{/if}
	</section>

	{#if hasDetails || data.obs}
		<section class="min-w-0">
			{#if hasDetails}
				<ListGroup title={m.playground_details()}>
					{#if data.surface}
						<ListRow title={m.playground_surface()} value={data.surface} />
					{/if}
					{#if data.dimensions}
						<ListRow
							title={m.playground_dimensions()}
							value={m.playground_dimensions_value({
								length: formatNumber(data.dimensions.length),
								width: formatNumber(data.dimensions.width)
							})}
						/>
					{/if}
					{#if data.capacity != null}
						<ListRow
							title={m.playground_capacity()}
							value={m.playground_capacity_value({ count: formatNumber(data.capacity) })}
						/>
					{/if}
					{#if data.club}
						{@const club = data.club}
						<ListRow title={club.name} subtitle={m.playground_club()} href={club.href}>
							{#snippet leading()}
								<Emblem src={club.emblem} name={club.name} size={32} plate={false} decorative />
							{/snippet}
						</ListRow>
					{/if}
				</ListGroup>
			{/if}
			{#if data.obs}
				<p class="mt-3 px-4 text-callout whitespace-pre-line text-ink-secondary">{data.obs}</p>
			{/if}
		</section>
	{/if}

	<section class="min-w-0 space-y-3">
		<h2 class="px-4 text-footnote font-semibold text-ink-secondary">
			{m.playground_location()}
		</h2>
		{#if data.location}
			<VenueMap src={data.location.mapUrl} title={m.playground_map_title({ name: data.name })} />
			<DirectionsButtons
				googleMapsUrl={data.location.googleMapsUrl}
				wazeUrl={data.location.wazeUrl}
			/>
		{:else}
			<div class="rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line dark:ring-0">
				<p class="text-callout text-ink-secondary">{m.game_directions_unknown()}</p>
			</div>
		{/if}
	</section>

	{#if data.stats}
		{@const stats = data.stats}
		<section class="min-w-0 space-y-2">
			<h2 class="px-4 text-footnote font-semibold text-ink-secondary">
				{m.playground_stats()}
			</h2>
			<div class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
				<dl class="grid grid-cols-3 gap-3 text-center">
					<div class="min-w-0">
						<dt class="text-footnote text-ink-secondary">{m.playground_stats_games()}</dt>
						<dd class="text-title-2 text-ink tabular-nums">{formatNumber(stats.total)}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-footnote text-ink-secondary">
							{m.playground_stats_goals_per_game()}
						</dt>
						<dd class="text-title-2 text-ink tabular-nums">
							{formatNumber(stats.goalsPerGame, 1)}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-footnote text-ink-secondary">{m.playground_stats_since()}</dt>
						<dd class="truncate text-title-2 text-ink tabular-nums">
							{formatMonthYear(stats.firstGame)}
						</dd>
					</div>
				</dl>
				<div class="mt-4 border-t border-line pt-4">
					<ResultSplit
						{...stats}
						homeLabel={m.playground_home_wins()}
						drawLabel={m.game_h2h_draws()}
						awayLabel={m.playground_away_wins()}
						label={m.playground_record_label()}
					/>
				</div>
			</div>
		</section>
	{/if}

	<section class="min-w-0 space-y-3">
		<SectionHeader title={m.playground_games_played()} count={data.games.total} />
		{#key data.id}
			<PagedMatches
				items={gameItems}
				total={data.games.total}
				nextOffset={data.games.nextOffset}
				{loadPage}
				emptyText={m.playground_no_games()}
				remainingCount={data.games.remainingCount}
				remainingText={m.playground_more({ count: data.games.remainingCount })}
				{loginHref}
				seasonHeaders
			/>
		{/key}
	</section>

	{#if data.editHref}
		<section class="min-w-0">
			<ListGroup>
				<ListRow title={m.playground_edit()} href={data.editHref} />
			</ListGroup>
		</section>
	{/if}
</div>
