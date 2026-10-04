<script lang="ts">
	import { page } from '$app/state';
	import CompassIcon from 'phosphor-svelte/lib/CompassIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
	import CloudWarningIcon from 'phosphor-svelte/lib/CloudWarningIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import { m } from '#lib/messages.ts';

	const status = $derived(page.status);
	const serverError = $derived(status >= 500);

	// Other 4xx codes share the 400 copy, other 5xx codes the 500 copy.
	const copy = $derived(
		status === 404
			? { icon: CompassIcon, title: m.error_404_title(), text: m.error_404_text() }
			: serverError
				? { icon: CloudWarningIcon, title: m.error_500_title(), text: m.error_500_text() }
				: { icon: WarningCircleIcon, title: m.error_400_title(), text: m.error_400_text() }
	);
	const ErrorIcon = $derived(copy.icon);
	const retryHref = $derived(page.url.pathname + page.url.search);
</script>

<svelte:head>
	<title>{copy.title} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section
	class="flex min-h-[calc(100svh-var(--content-top)-var(--content-bottom))] flex-col items-center justify-center px-2 text-center"
>
	<div
		aria-hidden="true"
		class="flex size-18 items-center justify-center rounded-full bg-fill text-ink-secondary"
	>
		<ErrorIcon size={36} />
	</div>

	<p class="mt-5 text-footnote font-semibold text-ink-tertiary tabular-nums">
		{m.error_code({ status })}
	</p>
	<h1 class="mt-1 text-title-1 text-ink">{copy.title}</h1>
	<p class="mt-2 max-w-sm text-callout text-ink-secondary">{copy.text}</p>

	<div class="mt-8 flex w-full max-w-xs flex-col gap-3">
		{#if serverError}
			<Button href={retryHref} size="lg" full data-sveltekit-reload>{m.error_retry()}</Button>
		{/if}
		<Button href="/" variant={serverError ? 'tinted' : 'filled'} size="lg" full>
			{m.error_home()}
		</Button>
	</div>
</section>
