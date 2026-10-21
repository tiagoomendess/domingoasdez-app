<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import CommentSection from '#lib/components/comments/CommentSection.svelte';
	import CommentVote from '#lib/components/comments/CommentVote.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import Toast from '#lib/components/ui/Toast.svelte';
	import {
		sortThreads,
		type CommentSort,
		type CommentVote as Vote,
		type VotedComment
	} from '#lib/comments.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		comments: VotedComment[];
		user: { name: string; picture: string | null } | null;
		/** The page path, so signing in brings the reader back here. */
		returnTo: string;
		/** The page's comments API base, e.g. `/api/jogos/12/comentarios`; votes go to `{base}/{id}/voto`. */
		apiBase: string;
		/** Text under "Ainda não há comentários". */
		emptyText?: string;
		class?: string;
	};

	let { comments, user, returnTo, apiBase, emptyText, class: className }: Props = $props();

	let sort = $state<CommentSort>('top');

	/**
	 * Optimistic votes on top of the server data. An override stays while its request is in
	 * flight, and after that only until the next load (a 30 s live refresh, a post), whose
	 * `comments` already carry the vote.
	 */
	type Override = { score: number; myVote: Vote; pending: boolean; base: VotedComment[] };
	const overrides = new SvelteMap<number, Override>();
	/** Latest request per comment, so an older response can't overwrite a newer tap. */
	const latest: Record<number, number> = {};
	let requestSeq = 0;

	let toastVisible = $state(false);

	const loginHref = $derived(
		`/conta/entrar?redirectTo=${encodeURIComponent(`${returnTo}#comentarios`)}`
	);

	function withVotes(comment: VotedComment): VotedComment {
		const override = overrides.get(comment.id);
		const live = override && (override.pending || override.base === comments);
		return {
			...comment,
			...(live ? { score: override.score, myVote: override.myVote } : {}),
			replies: comment.replies.map(withVotes)
		};
	}

	// Sorted by the server scores, so a comment doesn't jump away when you vote on it.
	const threads = $derived(sortThreads(comments, sort).map(withVotes));

	async function vote(comment: VotedComment, value: 1 | -1) {
		const next: Vote = comment.myVote === value ? 0 : value;
		const seq = ++requestSeq;
		latest[comment.id] = seq;
		overrides.set(comment.id, {
			score: comment.score - comment.myVote + next,
			myVote: next,
			pending: true,
			base: comments
		});

		try {
			const response = await fetch(`${apiBase}/${comment.id}/voto`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ value: next })
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result: { score: number; myVote: Vote } = await response.json();
			if (latest[comment.id] !== seq) return;
			overrides.set(comment.id, { ...result, pending: false, base: comments });
		} catch {
			if (latest[comment.id] !== seq) return;
			overrides.delete(comment.id);
			toastVisible = true;
		}
	}
</script>

<CommentSection
	comments={threads}
	{user}
	{returnTo}
	{emptyText}
	class={className}
	toolbar={threads.length > 1 ? toolbar : undefined}
	{commentActions}
/>

{#snippet toolbar()}
	<SegmentedControl
		bind:value={sort}
		label={m.comments_sort_label()}
		options={[
			{ value: 'top', label: m.comments_sort_top() },
			{ value: 'new', label: m.comments_sort_new() },
			{ value: 'old', label: m.comments_sort_old() }
		]}
	/>
{/snippet}

{#snippet commentActions(item: VotedComment)}
	<CommentVote
		score={item.score}
		myVote={item.myVote}
		own={item.mine}
		loginHref={user ? null : loginHref}
		onvote={(value) => vote(item, value)}
	/>
{/snippet}

<Toast bind:visible={toastVisible} message={m.comments_vote_error()} tone="error" />
