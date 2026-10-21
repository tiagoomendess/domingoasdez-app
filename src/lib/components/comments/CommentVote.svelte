<script lang="ts">
	import ArrowFatDownIcon from 'phosphor-svelte/lib/ArrowFatDownIcon';
	import ArrowFatUpIcon from 'phosphor-svelte/lib/ArrowFatUpIcon';
	import type { CommentVote } from '#lib/comments.ts';
	import { getLocale, m } from '#lib/messages.ts';
	import { countIn, countOut } from '#lib/motion.ts';

	type Props = {
		score: number;
		myVote: CommentVote;
		/** Guests: the arrows link here instead of voting. */
		loginHref?: string | null;
		/** The viewer's own comment: arrows shown but disabled. */
		own?: boolean;
		onvote?: (value: 1 | -1) => void;
	};

	let { score, myVote, loginHref = null, own = false, onvote }: Props = $props();

	const formatted = $derived(
		new Intl.NumberFormat(getLocale(), { notation: 'compact' }).format(score)
	);

	// Which way the number rolls: up when the score grows. Plain variable, not state.
	let previous: number | null = null;
	const direction = $derived.by(() => {
		const goingDown = previous != null && score < previous;
		previous = score;
		return goingDown ? -1 : 1;
	});

	const arrowClass =
		'grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-(--dur-fast)';
</script>

{#snippet arrow(value: 1 | -1)}
	{@const active = myVote === value}
	{@const Icon = value === 1 ? ArrowFatUpIcon : ArrowFatDownIcon}
	{@const label = value === 1 ? m.comments_upvote() : m.comments_downvote()}
	{#if loginHref}
		<a
			href={loginHref}
			class={[arrowClass, 'pressable text-ink-tertiary hover:bg-fill hover:text-ink']}
			aria-label="{label} · {m.comments_vote_login()}"
		>
			<Icon size={18} />
		</a>
	{:else}
		<button
			type="button"
			disabled={own}
			aria-pressed={active}
			aria-label={own ? `${label} · ${m.comments_vote_own()}` : label}
			title={own ? m.comments_vote_own() : undefined}
			class={[
				arrowClass,
				own ? 'cursor-not-allowed text-ink-tertiary opacity-40' : 'pressable hover:bg-fill',
				!own && active && value === 1 && 'text-accent-text',
				!own && active && value === -1 && 'text-ink',
				!own && !active && 'text-ink-tertiary hover:text-ink'
			]}
			onclick={() => onvote?.(value)}
		>
			<Icon size={18} weight={active ? 'fill' : 'regular'} />
		</button>
	{/if}
{/snippet}

<div class="-ml-3 flex items-center" role="group" aria-label={m.comments_score({ score })}>
	{@render arrow(1)}
	<span
		class={[
			'-mx-2 grid min-w-6 justify-items-center overflow-hidden text-footnote font-semibold tabular-nums',
			myVote === 1 ? 'text-accent-text' : myVote === -1 ? 'text-ink' : 'text-ink-secondary'
		]}
		aria-hidden="true"
	>
		{#key score}
			<span class="col-start-1 row-start-1" in:countIn={{ direction }} out:countOut={{ direction }}
				>{formatted}</span
			>
		{/key}
	</span>
	{@render arrow(-1)}
</div>
