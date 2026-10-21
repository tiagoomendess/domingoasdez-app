<script lang="ts" generics="T extends CommentNode<T>">
	import { tick, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import ChatsCircleIcon from 'phosphor-svelte/lib/ChatsCircleIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import CommentComposer from '#lib/components/comments/CommentComposer.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import SectionHeader from '#lib/components/ui/SectionHeader.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { countComments, type CommentNode } from '#lib/comments.ts';
	import { formatArticleDate, formatRelative } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		comments: T[];
		user: { name: string; picture: string | null } | null;
		/** The page path, so signing in brings the reader back here. */
		returnTo: string;
		/** Text under "Ainda não há comentários". */
		emptyText?: string;
		/** Between the section header and the card (e.g. a sort control). */
		toolbar?: Snippet;
		/** On each comment's action line, before "Responder" (e.g. votes). */
		commentActions?: Snippet<[T]>;
		class?: string;
	};

	let {
		comments,
		user,
		returnTo,
		emptyText = m.comments_empty_text(),
		toolbar,
		commentActions,
		class: className
	}: Props = $props();

	const total = $derived(countComments(comments));
	const loginHref = $derived(
		`/conta/entrar?redirectTo=${encodeURIComponent(`${returnTo}#comentarios`)}`
	);

	/** Only one reply box is open at a time, under the thread it answers. */
	let replyTo = $state<{ threadId: number; id: number; name: string } | null>(null);
	let flashId = $state<number | null>(null);

	let deleting = $state<T | null>(null);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let deleteError = $state<string | null>(null);

	function startReply(threadId: number, comment: T) {
		replyTo = { threadId, id: comment.id, name: comment.authorName };
	}

	async function onposted(id: number) {
		replyTo = null;
		flashId = id;
		await tick();
		document
			.getElementById(`comentario-${id}`)
			?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function askDelete(comment: T) {
		deleting = comment;
		deleteError = null;
		deleteOpen = true;
	}

	function deleteErrorMessage(code: unknown) {
		return code === 'forbidden'
			? m.comments_error_forbidden()
			: code === 'not_found'
				? m.comments_error_not_found()
				: m.comments_error_generic();
	}
</script>

{#snippet comment(item: T, threadId: number, reply: boolean)}
	<article
		id="comentario-{item.id}"
		class={[
			'-mx-2 -my-1 flex scroll-mt-24 gap-3 rounded-inner px-2 py-1',
			flashId === item.id && 'animate-new-flash motion-reduce:animate-none'
		]}
		onanimationend={() => (flashId = null)}
	>
		<div class="pt-0.5">
			<Avatar name={item.authorName} src={item.authorPicture} size={reply ? 28 : 40} />
		</div>
		<div class="min-w-0 flex-1">
			<header class="flex items-start gap-2">
				<p class="min-w-0 flex-1 text-footnote leading-tight">
					<span class="font-semibold text-ink">{item.authorName}</span>
					<span aria-hidden="true" class="mx-0.5 text-ink-tertiary">·</span>
					<time
						datetime={item.date}
						title={formatArticleDate(item.date)}
						class="text-ink-tertiary tabular-nums">{formatRelative(item.date)}</time
					>
				</p>
				{#if item.canDelete}
					<button
						type="button"
						class="-my-3 -mr-3 grid size-11 shrink-0 pressable place-items-center rounded-full text-ink-tertiary hover:bg-fill hover:text-danger"
						aria-label={m.comments_delete()}
						onclick={() => askDelete(item)}
					>
						<TrashIcon size={18} />
					</button>
				{/if}
			</header>
			<p class="mt-1 text-callout break-words whitespace-pre-line text-ink">{item.content}</p>
			{#if commentActions || user}
				<div class="-mb-3 flex items-center">
					{@render commentActions?.(item)}
					{#if user}
						<button
							type="button"
							class={[
								'inline-flex h-11 items-center rounded-full px-2 text-footnote font-semibold text-ink-secondary hover:bg-fill hover:text-ink',
								commentActions ? 'ml-1' : '-mx-2'
							]}
							aria-label="{m.comments_reply()} · {item.authorName}"
							onclick={() => startReply(threadId, item)}
						>
							{m.comments_reply()}
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</article>
{/snippet}

<section id="comentarios" class={['scroll-mt-24', className]} aria-labelledby="comentarios-title">
	<div id="comentarios-title">
		<SectionHeader title={m.comments_title()} count={total || undefined} />
	</div>

	{#if toolbar}
		<div class="mt-3">{@render toolbar()}</div>
	{/if}

	<div class="mt-3 rounded-card bg-surface ring-1 ring-line dark:ring-0">
		{#if comments.length === 0}
			<div class="flex flex-col items-center px-6 pt-8 pb-6 text-center">
				<ChatsCircleIcon size={40} class="text-ink-tertiary" />
				<h3 class="mt-3 text-headline text-ink">{m.comments_empty_title()}</h3>
				<p class="mt-1 text-subhead text-ink-secondary">{emptyText}</p>
			</div>
		{:else}
			<ol class="divide-y divide-line">
				{#each comments as thread (thread.id)}
					<li class="px-4 py-4">
						{@render comment(thread, thread.id, false)}

						{#if thread.replies.length > 0 || replyTo?.threadId === thread.id}
							<ol class="ml-[3.25rem]">
								{#each thread.replies as reply (reply.id)}
									<li class="mt-3">{@render comment(reply, thread.id, true)}</li>
								{/each}
							</ol>
						{/if}

						{#if user && replyTo?.threadId === thread.id}
							<div class="mt-3 ml-[3.25rem]">
								<CommentComposer
									{user}
									replyTo={{ id: replyTo.id, name: replyTo.name }}
									autofocus
									oncancel={() => (replyTo = null)}
									{onposted}
								/>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}

		<div class="border-t border-line p-4">
			{#if user}
				<CommentComposer {user} {onposted} />
			{:else}
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<div>
						<p class="text-headline text-ink">{m.comments_login_title()}</p>
						<p class="mt-0.5 text-subhead text-ink-secondary">{m.comments_login_text()}</p>
					</div>
					<Button href={loginHref} variant="tinted">{m.comments_login()}</Button>
				</div>
			{/if}
		</div>
	</div>
</section>

<Sheet bind:open={deleteOpen} title={m.comments_delete_title()}>
	<form
		method="POST"
		action="?/deleteComment"
		class="space-y-4"
		use:enhance={() => {
			deleteBusy = true;
			deleteError = null;
			return async ({ result, update }) => {
				deleteBusy = false;
				if (result.type === 'success') {
					deleteOpen = false;
					await update();
					return;
				}
				deleteError = deleteErrorMessage(result.type === 'failure' ? result.data?.error : null);
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="id" value={deleting?.id ?? ''} />

		{#if deleting}
			<blockquote
				class="line-clamp-3 rounded-field bg-surface-muted px-4 py-3 text-subhead break-words whitespace-pre-line text-ink-secondary"
			>
				{deleting.content}
			</blockquote>
		{/if}

		<p class="text-subhead text-ink-secondary">
			{deleting?.replies.length ? m.comments_delete_text_replies() : m.comments_delete_text()}
		</p>

		{#if deleteError}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{deleteError}
			</p>
		{/if}

		<div class="flex flex-col gap-3">
			<Button type="submit" variant="destructive" size="lg" full loading={deleteBusy}>
				{m.comments_delete_confirm()}
			</Button>
			<Button variant="plain" size="lg" full onclick={() => (deleteOpen = false)}>
				{m.comments_delete_cancel()}
			</Button>
		</div>
	</form>
</Sheet>
