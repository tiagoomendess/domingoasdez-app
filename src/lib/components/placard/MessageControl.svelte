<script lang="ts">
	import ChatTextIcon from 'phosphor-svelte/lib/ChatTextIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import TextArea from '#lib/components/ui/TextArea.svelte';
	import { m } from '#lib/messages.ts';
	import {
		MESSAGE_MAX_LENGTH,
		MESSAGE_MS,
		messageLength,
		normalizeMessage,
		type PlacardAction
	} from '#lib/placard.ts';

	type Props = {
		/** Seconds left of an overlay on the screen (an ad, a substitution, a message), or 0. */
		busySeconds: number;
		/** Sends the action; resolves true when the screen took it. */
		onsend: (action: PlacardAction) => Promise<boolean>;
	};

	let { busySeconds, onsend }: Props = $props();

	let text = $state('');
	let sending = $state(false);

	const length = $derived(messageLength(text));
	const message = $derived(normalizeMessage(text));

	async function send() {
		if (!message || sending) return;
		sending = true;
		if (await onsend({ type: 'show_message', text: message })) text = '';
		sending = false;
	}
</script>

<section
	class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0"
	aria-labelledby="msg-title"
>
	<h2 id="msg-title" class="text-headline text-ink">{m.placard_message_title()}</h2>
	<p class="mt-1 text-footnote text-ink-tertiary">
		{m.placard_message_hint({ seconds: MESSAGE_MS / 1000 })}
	</p>
	<div class="mt-3 space-y-3">
		<!-- The browser stops typing at the limit; the server checks it again. -->
		<TextArea
			label={m.placard_message_label_field()}
			bind:value={text}
			rows={3}
			maxlength={MESSAGE_MAX_LENGTH}
			placeholder={m.placard_message_placeholder()}
			helper={m.placard_message_count({ count: length, max: MESSAGE_MAX_LENGTH })}
		/>
		<Button
			icon={ChatTextIcon}
			size="lg"
			full
			disabled={!message || busySeconds > 0}
			loading={sending}
			onclick={send}
		>
			<span class="tabular-nums">
				{busySeconds > 0 ? m.placard_sub_wait({ seconds: busySeconds }) : m.placard_message_show()}
			</span>
		</Button>
	</div>
</section>
