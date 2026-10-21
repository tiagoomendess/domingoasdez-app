<script lang="ts">
	import { createSubscriber } from 'svelte/reactivity';
	import FormGameSheet from '#lib/components/games/FormGameSheet.svelte';
	import { formClasses, formLabel, formSentence } from '#lib/components/games/form.ts';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import type { FormChip, MatchStatus } from '#lib/components/types.ts';
	import { formatKickoff, formatKickoffDay } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { rollIn, rollOut } from '#lib/motion.ts';

	type ClubSide = { name: string; emblem: string | null; href: string };
	type MvpWinner = { name: string; picture: string };

	type Props = {
		home: ClubSide;
		away: ClubSide;
		kickoff: string;
		status: MatchStatus;
		showScore: boolean;
		homeScore: number;
		awayScore: number;
		penalties?: { home: number; away: number } | null;
		homeForm?: FormChip[];
		awayForm?: FormChip[];
		mvpWinner?: MvpWinner | null;
		scoreReportHref?: string | null;
		onkickoff?: () => void;
	};

	let {
		home,
		away,
		kickoff,
		status,
		showScore,
		homeScore,
		awayScore,
		penalties = null,
		homeForm = [],
		awayForm = [],
		mvpWinner = null,
		scoreReportHref = null,
		onkickoff
	}: Props = $props();

	const postponed = $derived(status === 'postponed');
	const showStatusPill = $derived(
		status === 'live' || status === 'warmup' || status === 'finished' || status === 'postponed'
	);
	const showCountdown = $derived(!showScore && !postponed);
	const hasFooter = $derived(Boolean(mvpWinner || scoreReportHref));

	let clockMs = typeof Date !== 'undefined' ? Date.now() : 0;
	let notifiedKickoff: string | null = null;

	// Getters read live prop bindings so the interval never closes over stale values.
	const live = {
		get kickoff() {
			return kickoff;
		},
		get onkickoff() {
			return onkickoff;
		}
	};

	const subscribeClock = createSubscriber((update) => {
		const tick = () => {
			clockMs = Date.now();
			update();
			const at = live.kickoff;
			if (clockMs < new Date(at).getTime()) return;
			if (notifiedKickoff === at) return;
			notifiedKickoff = at;
			live.onkickoff?.();
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const now = $derived.by(() => {
		if (showScore || postponed) return Date.now();
		subscribeClock();
		return clockMs;
	});

	const remainingMs = $derived(Math.max(0, new Date(kickoff).getTime() - now));

	const countdown = $derived.by(() => {
		const total = Math.floor(remainingMs / 1000);
		const days = Math.floor(total / 86_400);
		const hours = Math.floor((total % 86_400) / 3_600);
		const minutes = Math.floor((total % 3_600) / 60);
		const seconds = total % 60;
		return { days, hours, minutes, seconds };
	});

	const winner = $derived.by(() => {
		if (status !== 'finished') return null;
		if (homeScore !== awayScore) return homeScore > awayScore ? 'home' : 'away';
		if (penalties) return penalties.home > penalties.away ? 'home' : 'away';
		return null;
	});

	function sideInk(slot: 'home' | 'away'): string {
		if (winner === null) return 'text-ink';
		if (winner === slot) return 'font-semibold text-ink';
		return 'font-normal text-ink-secondary';
	}

	/** The chip whose game is previewed; kept after closing so the sheet doesn't blank mid-exit. */
	let preview = $state<{ chip: FormChip; teamName: string } | null>(null);
	let previewOpen = $state(false);

	function openPreview(event: MouseEvent, chip: FormChip, teamName: string) {
		// Ctrl/⌘/Shift/middle click keep the link's own behaviour (new tab or window).
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
		preview = { chip, teamName };
		previewOpen = true;
	}

	/** "Águias da Graça venceu · Necessidades 2–1", so the chip says more than one letter. */
	function chipLabel(chip: FormChip, teamName: string): string {
		const opponent = chip.side === 'home' ? chip.match.away.name : chip.match.home.name;
		const { homeScore, awayScore } = chip.match;
		const score = homeScore != null && awayScore != null ? ` ${homeScore}–${awayScore}` : '';
		return `${formSentence(chip.result, teamName)} · ${opponent}${score}`;
	}
</script>

{#snippet clubColumn(side: ClubSide, slot: 'home' | 'away', form: FormChip[])}
	<div class="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
		<a href={side.href} class="flex min-w-0 flex-col items-center gap-2">
			<Emblem src={side.emblem} name={side.name} size={72} plate={false} decorative />
			<span class={['line-clamp-2 text-subhead', sideInk(slot)]}>
				{side.name}
			</span>
		</a>
		{#if form.length > 0}
			<div class="flex flex-wrap justify-center gap-1">
				{#each form as chip, i (`${chip.match.href}-${i}`)}
					<a
						href={chip.match.href}
						aria-haspopup="dialog"
						aria-label={chipLabel(chip, side.name)}
						onclick={(event) => openPreview(event, chip, side.name)}
						class={[
							'inline-flex size-7 items-center justify-center rounded-full text-caption font-semibold',
							formClasses(chip.result)
						]}
					>
						{formLabel(chip.result)}
					</a>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<section class="overflow-hidden rounded-card bg-surface p-4 ring-1 ring-line sm:p-5 dark:ring-0">
	<!-- Top meta: status left + kickoff right, or kickoff alone centered -->
	<div
		class={[
			'flex items-center gap-3',
			showStatusPill ? 'justify-between' : 'justify-center'
		]}
	>
		{#if showStatusPill}
			<StatusPill {status} />
		{/if}
		<time
			datetime={kickoff}
			class={[
				'text-footnote tabular-nums',
				postponed ? 'text-ink-tertiary line-through' : 'text-ink-secondary'
			]}
		>
			{formatKickoffDay(kickoff)}
			<span class="text-ink-tertiary">·</span>
			{formatKickoff(kickoff)}
		</time>
	</div>

	<!-- Teams + score/vs -->
	<div class="mt-4 flex items-center gap-3 sm:gap-4">
		{@render clubColumn(home, 'home', homeForm)}

		<div class="flex shrink-0 flex-col items-center justify-center text-center">
			{#if showScore}
				<div
					class="flex items-center justify-center gap-2 text-scoreboard tabular-nums"
					aria-live="polite"
				>
					<span
						class={[
							'grid min-w-[1.2ch] justify-items-center overflow-hidden',
							sideInk('home')
						]}
					>
						{#key homeScore}
							<span in:rollIn out:rollOut class="col-start-1 row-start-1 rounded-badge px-0.5">
								{homeScore}
							</span>
						{/key}
					</span>
					<span class="text-ink-tertiary" aria-hidden="true">–</span>
					<span
						class={[
							'grid min-w-[1.2ch] justify-items-center overflow-hidden',
							sideInk('away')
						]}
					>
						{#key awayScore}
							<span in:rollIn out:rollOut class="col-start-1 row-start-1 rounded-badge px-0.5">
								{awayScore}
							</span>
						{/key}
					</span>
				</div>
			{:else}
				<span class="text-title-3 text-ink-tertiary">vs</span>
			{/if}
		</div>

		{@render clubColumn(away, 'away', awayForm)}
	</div>

	{#if showScore && penalties}
		<p class="mt-2 text-center text-footnote text-ink-tertiary">{m.game_penalties(penalties)}</p>
	{/if}

	{#if showCountdown}
		<div
			class="mt-4 grid grid-cols-4 gap-2 rounded-inner bg-surface-muted p-3 sm:p-4"
			aria-live="polite"
		>
			{#each [{ value: countdown.days, label: m.game_countdown_days() }, { value: countdown.hours, label: m.game_countdown_hours() }, { value: countdown.minutes, label: m.game_countdown_minutes() }, { value: countdown.seconds, label: m.game_countdown_seconds() }] as unit (unit.label)}
				<div class="min-w-0 text-center">
					<span class="block text-headline text-ink tabular-nums">
						{String(unit.value).padStart(2, '0')}
					</span>
					<span class="text-caption text-ink-tertiary">{unit.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if hasFooter}
		<div class="mt-4 space-y-3 border-t border-line pt-4">
			{#if mvpWinner}
				<div
					class="flex items-center justify-center gap-2 rounded-full bg-fill px-3 py-2 text-footnote text-ink"
				>
					<img
						src={mvpWinner.picture}
						alt=""
						width="28"
						height="28"
						class="size-7 rounded-full object-cover"
					/>
					<span>
						<span class="font-semibold">{m.game_mvp_label()}</span>
						<span class="text-ink-secondary"> · {mvpWinner.name}</span>
					</span>
				</div>
			{/if}

			{#if scoreReportHref}
				<div class="text-center">
					<a
						href={scoreReportHref}
						class="text-footnote font-medium text-accent-text hover:underline"
					>
						{m.game_wrong_score()}
					</a>
				</div>
			{/if}
		</div>
	{/if}
</section>

<FormGameSheet
	bind:open={previewOpen}
	chip={preview?.chip ?? null}
	teamName={preview?.teamName ?? ''}
/>
