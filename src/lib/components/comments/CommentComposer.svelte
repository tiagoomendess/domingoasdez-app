<script lang="ts">
	import { enhance } from '$app/forms';
	import PaperPlaneRightIcon from 'phosphor-svelte/lib/PaperPlaneRightIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import { COMMENT_MAX_LENGTH, commentLength, normalizeComment } from '#lib/comments.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		user: { name: string; picture: string | null };
		/** Set when this composer answers a comment. */
		replyTo?: { id: number; name: string } | null;
		autofocus?: boolean;
		oncancel?: () => void;
		onposted?: (commentId: number) => void;
	};

	let { user, replyTo = null, autofocus = false, oncancel, onposted }: Props = $props();

	const uid = $props.id();
	/** The counter appears once a comment gets close to the legacy 255-character limit. */
	const COUNTER_FROM = 40;

	let value = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const left = $derived(COMMENT_MAX_LENGTH - commentLength(normalizeComment(value)));
	const canSend = $derived(!submitting && normalizeComment(value) !== '' && left >= 0);

	function errorMessage(code: unknown): string {
		switch (code) {
			case 'empty':
				return m.comments_error_empty();
			case 'too_long':
				return m.comments_error_too_long({ max: COMMENT_MAX_LENGTH });
			case 'too_fast':
				return m.comments_error_too_fast();
			case 'parent_not_found':
				return m.comments_error_parent();
			default:
				return m.comments_error_generic();
		}
	}

	/** Grows with its content up to a few lines, then scrolls. */
	function autosize(textarea: HTMLTextAreaElement) {
		$effect(() => {
			void value;
			textarea.style.height = 'auto';
			textarea.style.height = `${textarea.scrollHeight}px`;
		});
		if (autofocus) textarea.focus({ preventScroll: false });
	}

	function onkeydown(event: KeyboardEvent) {
		// Enter adds a line; Ctrl/⌘ + Enter posts, as in most comment boxes.
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			if (canSend) (event.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
		} else if (event.key === 'Escape' && oncancel) {
			event.preventDefault();
			oncancel();
		}
	}
</script>

<form
	method="POST"
	action="?/comment"
	class="flex gap-3"
	use:enhance={() => {
		submitting = true;
		error = null;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') {
				value = '';
				await update();
				const id = Number(result.data?.commentId);
				if (Number.isSafeInteger(id)) onposted?.(id);
				return;
			}
			if (result.type === 'redirect') {
				await update();
				return;
			}
			error = errorMessage(result.type === 'failure' ? result.data?.error : null);
			await update({ reset: false, invalidateAll: false });
		};
	}}
>
	<div class="pt-1">
		<Avatar name={user.name} src={user.picture} size={replyTo ? 28 : 40} />
	</div>

	<div class="min-w-0 flex-1">
		{#if replyTo}
			<div class="mb-1.5 flex items-center gap-1 px-1">
				<p class="min-w-0 flex-1 truncate text-footnote text-ink-tertiary">
					{m.comments_replying_to({ name: replyTo.name })}
				</p>
				<button
					type="button"
					class="-my-3 -mr-3 grid size-11 shrink-0 pressable place-items-center rounded-full text-ink-tertiary hover:bg-fill"
					aria-label={m.comments_cancel_reply()}
					onclick={() => oncancel?.()}
				>
					<XIcon size={16} weight="bold" />
				</button>
			</div>
			<input type="hidden" name="parent" value={replyTo.id} />
		{/if}

		<label for="{uid}-field" class="sr-only">
			{replyTo ? m.comments_reply_label() : m.comments_label()}
		</label>
		<div
			class={[
				'flex items-end gap-1 rounded-field bg-surface-muted py-1 pr-1 pl-4',
				'focus-within:ring-2 focus-within:ring-accent',
				(error || left < 0) && 'ring-2 ring-danger focus-within:ring-danger'
			]}
		>
			<textarea
				{@attach autosize}
				id="{uid}-field"
				name="comment"
				rows="1"
				bind:value
				{onkeydown}
				placeholder={replyTo ? m.comments_reply_placeholder() : m.comments_placeholder()}
				aria-invalid={error || left < 0 ? true : undefined}
				aria-describedby={error || left < COUNTER_FROM ? `${uid}-hint` : undefined}
				class="max-h-40 min-h-11 flex-1 resize-none border-0 bg-transparent px-0 py-2.5 text-body text-ink placeholder:text-ink-tertiary focus:ring-0 focus:outline-none"
			></textarea>
			<button
				type="submit"
				disabled={!canSend}
				aria-label={m.comments_send()}
				class={[
					'grid size-11 shrink-0 pressable place-items-center rounded-full transition-colors duration-(--dur-fast)',
					canSend ? 'bg-accent text-accent-fg' : 'text-ink-tertiary',
					submitting && 'opacity-60'
				]}
			>
				<PaperPlaneRightIcon size={20} weight="fill" />
			</button>
		</div>

		{#if error || left < COUNTER_FROM}
			<p
				id="{uid}-hint"
				role={error ? 'alert' : undefined}
				class={[
					'mt-1.5 px-1 text-footnote',
					error || left < 0 ? 'text-danger' : 'text-ink-tertiary',
					!error && 'tabular-nums'
				]}
			>
				{error ?? m.comments_remaining({ count: left })}
			</p>
		{/if}
	</div>
</form>
