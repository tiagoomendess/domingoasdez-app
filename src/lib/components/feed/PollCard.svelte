<script lang="ts">
	import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import type { PollAnswer, PollState } from '#lib/components/types.ts';
	import { formatRelative, formatShortDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		href: string;
		question: string;
		state: PollState;
		answers: PollAnswer[];
		closed?: boolean;
		endsAt?: string;
		resultsAt?: string;
	};

	let { href, question, state, answers, closed = false, endsAt, resultsAt }: Props = $props();

	const PREVIEW_COUNT = 3;

	const total = $derived(answers.reduce((sum, answer) => sum + (answer.votes ?? 0), 0));
	const ranked = $derived(
		[...answers].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, PREVIEW_COUNT)
	);
	const percent = (votes = 0) => (total ? Math.round((votes / total) * 100) : 0);
</script>

<article
	class="relative rounded-card bg-surface p-4 ring-1 ring-line outline-accent transition-transform duration-(--dur-press) ease-snappy has-[a:active]:scale-98 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 motion-reduce:has-[a:active]:scale-100 dark:ring-0"
>
	<div class="flex items-center justify-between gap-3">
		<span class="inline-flex items-center gap-1.5 text-footnote font-semibold text-ink-secondary">
			<ChartBarHorizontalIcon size={16} weight="fill" />
			{m.poll_label()}
		</span>
		{#if closed}
			<StatusPill status="closed" />
		{:else}
			<StatusPill
				status="open"
				label={endsAt ? m.poll_ends({ when: formatRelative(endsAt) }) : undefined}
			/>
		{/if}
	</div>

	<h3 class="mt-3 text-title-3 text-ink">
		<a {href} class="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
			{question}
		</a>
	</h3>

	{#if state === 'results'}
		<ul class="mt-4 space-y-2">
			{#each ranked as answer, i (answer.id)}
				<li class="relative overflow-hidden rounded-inner bg-fill">
					<span
						aria-hidden="true"
						class={['absolute inset-y-0 left-0', i === 0 ? 'bg-gold-400/45' : 'bg-fill-strong']}
						style:width="{percent(answer.votes)}%"
					></span>
					<span class="relative flex items-center justify-between gap-3 px-3 py-2 text-subhead">
						<span class={['truncate text-ink', i === 0 && 'font-semibold']}>{answer.label}</span>
						<span class="font-semibold text-ink tabular-nums">{percent(answer.votes)}%</span>
					</span>
				</li>
			{/each}
		</ul>
		<p class="mt-2 text-footnote text-ink-tertiary">{m.poll_votes({ count: total })}</p>
	{:else if state === 'pending' && resultsAt}
		<p class="mt-3 text-subhead text-ink-secondary">
			{m.poll_results_from({ date: formatShortDate(resultsAt) })}
		</p>
	{:else}
		<ul class="mt-4 space-y-2">
			{#each answers.slice(0, PREVIEW_COUNT) as answer (answer.id)}
				<li class="truncate rounded-inner bg-fill px-3 py-2 text-subhead text-ink">
					{answer.label}
				</li>
			{/each}
		</ul>
		<span
			aria-hidden="true"
			class="mt-4 inline-flex h-11 items-center rounded-full bg-accent-tint px-5 text-callout font-semibold text-accent-text"
		>
			{m.poll_vote()}
		</span>
	{/if}
</article>
