<script lang="ts">
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
	import { m } from '#lib/messages.ts';

	type Props = {
		href: string;
		feedbackHref?: string | null;
	};

	let { href, feedbackHref = null }: Props = $props();
</script>

<aside class="flex gap-3 rounded-card bg-accent-tint px-4 py-3.5 text-callout text-ink">
	<InfoIcon size={20} weight="fill" class="mt-0.5 shrink-0 text-accent-text" />
	<p>
		{m.feed_disclaimer_before()}{#if feedbackHref}<a
				href={feedbackHref}
				class="font-semibold text-accent-text underline-offset-2 hover:underline"
				target="_blank"
				rel="noopener noreferrer">{m.feed_disclaimer_feedback()}</a
			>{:else}{m.feed_disclaimer_feedback()}{/if}{m.feed_disclaimer_after()}<a
			{href}
			class="font-semibold text-accent-text underline-offset-2 hover:underline"
			target="_blank"
			rel="noopener noreferrer">{m.feed_disclaimer_link()}</a
		>.
	</p>
</aside>
