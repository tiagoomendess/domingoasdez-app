<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import TextArea from '#lib/components/ui/TextArea.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { formatLisbonDay, formatLisbonTime } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { playerDisplayName } from '#lib/players.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const interview = $derived(data.interview);

	// Snapshot the server data once for input initial values (plain const, so
	// the helpers below never capture reactive state).
	const initial = data.interview;

	function initialPick(index: number): string {
		const goal = initial.goals[index];
		if (!goal) return '0';
		if (goal.ownGoal) return '-1';
		if (goal.playerId != null) return String(goal.playerId);
		return '0';
	}

	function initialMinute(index: number): string {
		const minute = initial.goals[index]?.minute;
		return minute != null ? String(minute) : '';
	}

	let picks = $state<string[]>(
		Array.from({ length: initial.amountOfGoals }, (_, i) => initialPick(i))
	);
	let minutes = $state<string[]>(
		Array.from({ length: initial.amountOfGoals }, (_, i) => initialMinute(i))
	);
	let content = $state(initial.content);
	let submitting = $state(false);
	let tipsOpen = $state(false);

	// Echo a failed submission back into the textarea. Reads `form` only and
	// writes `content` only, so it can never read-then-write the same state.
	$effect(() => {
		const failed = form?.content;
		if (failed != null) content = failed;
	});

	const scorersTitle = $derived(
		interview.amountOfGoals === 1
			? m.flash_interview_scorers_one({ club: interview.recipientClubName })
			: m.flash_interview_scorers_many({
					club: interview.recipientClubName,
					count: interview.amountOfGoals
				})
	);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<article class="space-y-4">
	<header class="space-y-3 px-1 pt-1">
		<p class="text-center text-footnote font-semibold text-ink-secondary">
			{interview.competition}
		</p>
		<div class="flex items-center justify-center gap-8">
			<Emblem
				name={interview.home.name}
				src={interview.home.emblem}
				size={72}
				plate={false}
				decorative
			/>
			<Emblem
				name={interview.away.name}
				src={interview.away.emblem}
				size={72}
				plate={false}
				decorative
			/>
		</div>
		<h1 class="text-center text-headline text-ink tabular-nums">
			{interview.home.name}
			{interview.home.score} - {interview.away.score}
			{interview.away.name}
		</h1>
	</header>

	<p class="px-1 text-body text-ink-secondary">
		{m.flash_interview_intro({
			club: interview.recipientClubName,
			date: formatLisbonDay(interview.gameDateIso)
		})}
	</p>

	<form
		method="POST"
		class="space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		{#if form?.error === 'invalid'}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{m.flash_interview_error_invalid()}
			</p>
		{/if}

		{#if interview.amountOfGoals > 0}
			<section class="space-y-3 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
				<h2 class="text-headline text-ink">{scorersTitle}</h2>
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars — index-only iteration -->
				{#each picks as _, i (i)}
					<div class="flex items-end gap-3">
						<span
							aria-hidden="true"
							class="flex h-13 w-6 shrink-0 items-center justify-center text-headline text-ink-tertiary tabular-nums"
						>
							{i + 1}
						</span>
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<label for="player-{i}" class="px-1 text-footnote font-semibold text-ink-secondary">
								{m.flash_interview_player_label()}
							</label>
							<select
								id="player-{i}"
								name="players[]"
								bind:value={picks[i]}
								disabled={!interview.canEdit || submitting}
								class="h-13 w-full rounded-field border-0 bg-surface-muted px-4 text-body text-ink focus:ring-2 focus:ring-accent focus:ring-offset-0 focus:outline-none disabled:opacity-40"
							>
								<option value="" disabled>{m.flash_interview_player_placeholder()}</option>
								<option value="-1">{m.flash_interview_own_goal()}</option>
								{#each interview.players as player (player.id)}
									<option value={String(player.id)}>
										{playerDisplayName(player.name, player.nickname)}
									</option>
								{/each}
								<option value="0">{m.flash_interview_missing_player()}</option>
							</select>
						</div>
						<div class="w-28 shrink-0">
							<TextField
								label={m.flash_interview_minute()}
								name="minutes[]"
								type="number"
								min={1}
								bind:value={minutes[i]}
								disabled={!interview.canEdit || submitting}
							/>
						</div>
					</div>
				{/each}
			</section>
		{/if}

		<section class="space-y-3 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			<h2 class="text-headline text-ink">
				{m.flash_interview_comment_question({ club: interview.recipientClubName })}
			</h2>
			<TextArea
				label={m.flash_interview_comment_label()}
				name="content"
				rows={5}
				maxlength={1000}
				bind:value={content}
				disabled={!interview.canEdit || submitting}
			/>
			<button
				type="button"
				class="px-1 text-footnote font-medium text-accent-text hover:underline"
				onclick={() => (tipsOpen = true)}
			>
				{m.flash_interview_tips_link()}
			</button>
		</section>

		{#if interview.canEdit}
			<div class="space-y-2">
				<Button type="submit" size="lg" full loading={submitting} disabled={submitting}>
					{m.flash_interview_save()}
				</Button>
				{#if interview.deadlineIso}
					<p class="px-1 text-footnote text-ink-tertiary">
						{m.flash_interview_deadline_ok({
							date: formatLisbonDay(interview.deadlineIso),
							time: formatLisbonTime(interview.deadlineIso)
						})}
					</p>
				{/if}
			</div>
		{:else}
			<p class="px-1 text-footnote text-ink-tertiary">
				{m.flash_interview_deadline_passed()}
			</p>
		{/if}
	</form>
</article>

<Sheet bind:open={tipsOpen} title={m.flash_interview_tips_title()}>
	<div class="space-y-3">
		<p class="text-body text-ink-secondary">{m.flash_interview_tips_intro()}</p>
		<ol class="list-decimal space-y-1.5 pl-5 text-body text-ink">
			<li>{m.flash_interview_tips_1()}</li>
			<li>{m.flash_interview_tips_2()}</li>
			<li>{m.flash_interview_tips_3()}</li>
			<li>{m.flash_interview_tips_4()}</li>
			<li>{m.flash_interview_tips_5()}</li>
		</ol>
		<p class="text-footnote text-ink-tertiary">{m.flash_interview_tips_note()}</p>
		<Button variant="outline" full onclick={() => (tipsOpen = false)}>
			{m.flash_interview_tips_close()}
		</Button>
	</div>
</Sheet>
