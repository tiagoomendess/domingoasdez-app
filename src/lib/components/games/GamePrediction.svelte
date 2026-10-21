<script lang="ts">
	import { enhance } from '$app/forms';
	import CalendarBlankIcon from 'phosphor-svelte/lib/CalendarBlankIcon';
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
	import MinusCircleIcon from 'phosphor-svelte/lib/MinusCircleIcon';
	import XCircleIcon from 'phosphor-svelte/lib/XCircleIcon';
	import PredictionSplit from '#lib/components/games/PredictionSplit.svelte';
	import ScoreStepper from '#lib/components/games/ScoreStepper.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import { formatKickoffDay } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import {
		PREDICTION_WINDOW_DAYS,
		predictedOutcome,
		type GameKind,
		type Outcome,
		type Prediction,
		type PredictionSummary,
		type PredictionVerdict,
		type Side
	} from '#lib/predictions.ts';

	type Club = { name: string; emblem: string | null };

	type Props = {
		prediction: {
			kind: GameKind;
			open: boolean;
			/** Kick-off is still more than the window away: show when predictions open. */
			early: boolean;
			opensAt: string;
			mine: Prediction | null;
			summary: PredictionSummary | null;
			actual: Outcome | null;
			verdict: PredictionVerdict | null;
		};
		home: Club;
		away: Club;
		user: { name: string } | null;
		/** The game path, so signing in brings the reader back here. */
		returnTo: string;
	};

	let { prediction, home, away, user, returnTo }: Props = $props();

	const loginHref = $derived(
		`/conta/entrar?redirectTo=${encodeURIComponent(`${returnTo}#previsao`)}`
	);

	/** null: follow the data (edit when there's no prediction yet); true/false: the user chose. */
	let editingChoice = $state<boolean | null>(null);
	const editing = $derived(!!user && prediction.open && (editingChoice ?? prediction.mine == null));

	let draftHome = $state(0);
	let draftAway = $state(0);
	let draftPenalties = $state<Side | ''>('');

	let submitting = $state(false);
	let error = $state<string | null>(null);
	let flash = $state(false);

	const knockout = $derived(prediction.kind === 'knockout');
	const needsPenalties = $derived(knockout && draftHome === draftAway);
	const canSave = $derived(!submitting && (!needsPenalties || draftPenalties !== ''));

	/** Nothing to show: closed, no prediction of yours, and nobody else predicted either. */
	const hidden = $derived(
		!prediction.open &&
			!prediction.early &&
			!prediction.mine &&
			(prediction.summary?.total ?? 0) === 0
	);

	function startEditing() {
		const mine = prediction.mine;
		draftHome = mine?.home ?? 0;
		draftAway = mine?.away ?? 0;
		draftPenalties = mine?.penaltyWinner ?? '';
		error = null;
		editingChoice = true;
	}

	function clubName(side: Side) {
		return side === 'home' ? home.name : away.name;
	}

	/** "Águias da Graça vence", "Empate", or "Águias da Graça passa nos penáltis". */
	function outcomeLine(p: Prediction): string {
		if (knockout && p.home === p.away) {
			return p.penaltyWinner
				? m.game_prediction_on_penalties({ team: clubName(p.penaltyWinner) })
				: m.game_prediction_pick_penalties();
		}
		const outcome = predictedOutcome(p, prediction.kind);
		return outcome === 'draw'
			? m.game_prediction_draw()
			: m.game_prediction_win({ team: clubName(outcome) });
	}

	const draft = $derived<Prediction>({
		home: draftHome,
		away: draftAway,
		penaltyWinner: needsPenalties && draftPenalties !== '' ? draftPenalties : null
	});

	const verdict = $derived.by(() => {
		const v = prediction.verdict;
		if (!v) return null;
		if (v.exact)
			return { tone: 'good', icon: CheckCircleIcon, text: m.game_prediction_verdict_exact() };
		if (v.winner === 'right') {
			return {
				tone: 'good',
				icon: CheckCircleIcon,
				text:
					prediction.actual === 'draw'
						? m.game_prediction_verdict_draw()
						: m.game_prediction_verdict_winner()
			};
		}
		if (v.winner === 'void')
			return { tone: 'quiet', icon: MinusCircleIcon, text: m.game_prediction_verdict_void() };
		return { tone: 'quiet', icon: XCircleIcon, text: m.game_prediction_verdict_wrong() };
	});

	function errorMessage(code: unknown) {
		return code === 'closed'
			? m.game_prediction_error_closed()
			: code === 'not_open'
				? m.game_prediction_error_not_open()
				: code === 'invalid'
					? m.game_prediction_error_invalid()
					: m.game_prediction_error_generic();
	}
</script>

{#snippet yours(p: Prediction)}
	<div
		class={[
			'-mx-2 rounded-inner px-2 py-1',
			flash && 'animate-new-flash motion-reduce:animate-none'
		]}
		onanimationend={() => (flash = false)}
	>
		<p class="text-footnote font-semibold text-ink-secondary">{m.game_prediction_yours()}</p>
		<div class="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
			<div class="flex min-w-0 flex-col items-center gap-1.5 text-center">
				<Emblem src={home.emblem} name={home.name} size={40} plate={false} decorative />
				<span class="w-full truncate text-footnote text-ink-secondary">{home.name}</span>
			</div>
			<p
				class="text-title-1 text-ink tabular-nums"
				aria-label="{home.name} {p.home}, {away.name} {p.away}"
			>
				{p.home}<span class="mx-1.5 text-ink-tertiary">–</span>{p.away}
			</p>
			<div class="flex min-w-0 flex-col items-center gap-1.5 text-center">
				<Emblem src={away.emblem} name={away.name} size={40} plate={false} decorative />
				<span class="w-full truncate text-footnote text-ink-secondary">{away.name}</span>
			</div>
		</div>
		<p class="mt-2 text-center text-callout text-ink-secondary">{outcomeLine(p)}</p>
	</div>
{/snippet}

{#if !hidden}
	<section id="previsao" class="scroll-mt-24" aria-labelledby="previsao-title">
		<div id="previsao-title">
			<SectionHeader title={m.game_prediction_title()} />
		</div>

		<div class="mt-3 space-y-4 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			{#if !prediction.open && !prediction.early}
				<StatusPill status="closed" label={m.game_prediction_closed()} />
			{/if}

			{#if prediction.early}
				<div class="flex items-center gap-3">
					<CalendarBlankIcon size={28} class="shrink-0 text-ink-tertiary" aria-hidden="true" />
					<div class="min-w-0">
						<p class="text-headline text-ink">
							{m.game_prediction_opens({ day: formatKickoffDay(prediction.opensAt) })}
						</p>
						<p class="text-subhead text-ink-secondary">
							{m.game_prediction_opens_text({ days: PREDICTION_WINDOW_DAYS })}
						</p>
					</div>
				</div>
			{:else if prediction.open && !user}
				<!-- Guests: same prompt as the comments -->
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<div>
						<p class="text-headline text-ink">{m.game_prediction_login_title()}</p>
						<p class="mt-0.5 text-subhead text-ink-secondary">{m.game_prediction_login_text()}</p>
					</div>
					<Button href={loginHref} variant="tinted">{m.game_prediction_login()}</Button>
				</div>
			{:else if editing}
				<form
					method="POST"
					action="?/predict"
					class="space-y-4"
					use:enhance={() => {
						submitting = true;
						error = null;
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'success') {
								editingChoice = null;
								flash = true;
								await update({ reset: false });
								return;
							}
							if (result.type === 'redirect') {
								await update();
								return;
							}
							const code = result.type === 'failure' ? result.data?.error : null;
							error = errorMessage(code);
							// A closed window means the page is stale: reload it so the card closes too.
							await update({ reset: false, invalidateAll: code === 'closed' });
						};
					}}
				>
					<div class="divide-y divide-line">
						<ScoreStepper
							name={home.name}
							emblem={home.emblem}
							inputName="home"
							bind:value={draftHome}
						/>
						<ScoreStepper
							name={away.name}
							emblem={away.emblem}
							inputName="away"
							bind:value={draftAway}
						/>
					</div>

					{#if needsPenalties}
						<div class="space-y-2">
							<p class="text-footnote font-semibold text-ink">
								{m.game_prediction_penalties_question()}
							</p>
							<SegmentedControl
								bind:value={draftPenalties}
								label={m.game_prediction_penalties_question()}
								options={[
									{ value: 'home', label: home.name },
									{ value: 'away', label: away.name }
								]}
							/>
							<input type="hidden" name="penaltyWinner" value={draftPenalties} />
						</div>
					{/if}

					<p class="text-center text-callout text-ink-secondary" aria-live="polite">
						{outcomeLine(draft)}
					</p>

					{#if error}
						<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
							{error}
						</p>
					{/if}

					<div class="flex flex-col gap-2">
						<Button type="submit" size="lg" full loading={submitting} disabled={!canSave}>
							{m.game_prediction_save()}
						</Button>
						{#if prediction.mine}
							<Button variant="plain" full onclick={() => (editingChoice = false)}>
								{m.game_prediction_cancel()}
							</Button>
						{/if}
					</div>

					<p class="text-center text-footnote text-ink-tertiary">
						{knockout
							? `${m.game_prediction_knockout_hint()} · ${m.game_prediction_edit_hint()}`
							: m.game_prediction_edit_hint()}
					</p>
				</form>
			{:else if prediction.mine}
				{@render yours(prediction.mine)}

				{#if verdict}
					<p
						class={[
							'flex items-center gap-2 rounded-field px-3 py-2.5 text-subhead font-semibold',
							verdict.tone === 'good' ? 'bg-success/14 text-success' : 'bg-fill text-ink-secondary'
						]}
					>
						<verdict.icon size={20} weight="fill" aria-hidden="true" />
						{verdict.text}
					</p>
				{/if}

				{#if prediction.open}
					<Button variant="tinted" full onclick={startEditing}>{m.game_prediction_change()}</Button>
				{/if}
			{:else if user}
				<p class="text-subhead text-ink-secondary">{m.game_prediction_none()}</p>
			{/if}

			{#if prediction.summary && prediction.summary.total > 0 && !editing}
				<div class={[(prediction.mine || !prediction.open) && 'border-t border-line pt-4']}>
					<PredictionSplit
						summary={prediction.summary}
						homeName={home.name}
						awayName={away.name}
						mine={prediction.mine ? predictedOutcome(prediction.mine, prediction.kind) : null}
						actual={prediction.actual}
					/>
				</div>
			{/if}
		</div>
	</section>
{/if}
