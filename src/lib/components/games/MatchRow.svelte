<script lang="ts">
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import type { Match, Team } from '#lib/components/types.ts';
	import { formatKickoff, formatKickoffDay } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { rollIn, rollOut } from '#lib/motion.ts';

	type Props = {
		match: Match;
		showDate?: boolean;
		onliveclick?: (match: Match) => void;
	};

	let { match, showDate = false, onliveclick }: Props = $props();

	const showScore = $derived(match.status === 'live' || match.status === 'finished');
	const interceptLive = $derived(match.status === 'live' && !!onliveclick);

	const winner = $derived.by(() => {
		const { status, homeScore, awayScore, penalties } = match;
		if (status !== 'finished' || homeScore == null || awayScore == null) return null;
		if (homeScore !== awayScore) return homeScore > awayScore ? 'home' : 'away';
		if (penalties) return penalties.home > penalties.away ? 'home' : 'away';
		return null;
	});

	const rowClass =
		'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill active:bg-fill-strong';
</script>

{#snippet team(team: Team, score: number | null | undefined, side: 'home' | 'away')}
	{@const lost = winner !== null && winner !== side}
	<span class="flex items-center gap-2.5">
		<Emblem src={team.emblem} name={team.name} size={24} plate={false} decorative />
		<span
			class={[
				'min-w-0 flex-1 truncate text-body',
				winner === side && 'font-semibold',
				lost ? 'text-ink-secondary' : 'text-ink'
			]}
		>
			{team.name}
		</span>
		{#if showScore}
			<span
				class={[
					'grid min-w-6 text-right text-headline tabular-nums',
					lost ? 'font-normal text-ink-secondary' : 'text-ink'
				]}
			>
				{#key score}
					<span in:rollIn out:rollOut class="col-start-1 row-start-1 rounded-badge px-1">
						{score ?? '–'}
					</span>
				{/key}
			</span>
		{/if}
	</span>
{/snippet}

{#snippet row()}
	<span class="flex w-12 shrink-0 flex-col items-center justify-center text-center">
		{#if showDate}
			<span class="mb-0.5 text-caption text-ink-tertiary">{formatKickoffDay(match.kickoff)}</span>
		{/if}
		{#if match.status === 'live'}
			<span
				aria-hidden="true"
				class="mb-1 size-2 animate-live-pulse rounded-full bg-live motion-reduce:animate-none"
			></span>
			<span class="text-caption font-semibold text-live">{m.status_live()}</span>
		{:else if match.status === 'warmup'}
			<span class="text-caption font-semibold text-warmup">{m.status_warmup()}</span>
		{:else if match.status === 'finished'}
			<span class="text-caption font-semibold text-ink-tertiary">{m.status_finished()}</span>
		{:else if match.status === 'postponed'}
			<span class="text-caption font-semibold text-warning">{m.status_postponed()}</span>
		{:else}
			<time datetime={match.kickoff} class="text-subhead font-semibold text-ink tabular-nums">
				{formatKickoff(match.kickoff)}
			</time>
		{/if}
	</span>
	<span class="min-w-0 flex-1 space-y-1.5">
		{@render team(match.home, match.homeScore, 'home')}
		{@render team(match.away, match.awayScore, 'away')}
		{#if match.penalties}
			<span class="block pl-[2.125rem] text-footnote text-ink-tertiary">
				{m.game_penalties(match.penalties)}
			</span>
		{/if}
	</span>
{/snippet}

{#if interceptLive}
	<button type="button" class={rowClass} onclick={() => onliveclick?.(match)}>
		{@render row()}
	</button>
{:else}
	<a href={match.href} class={rowClass}>
		{@render row()}
	</a>
{/if}
