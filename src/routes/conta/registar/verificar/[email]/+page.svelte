<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const verifyError = $derived.by(() => {
		switch (data.error) {
			case 'already_verified':
				return m.register_verify_error_already_verified();
			case 'missing':
				return m.register_verify_error_missing();
			case 'token_mismatch':
				return m.register_verify_error_token_mismatch();
			default:
				return null;
		}
	});
</script>

<svelte:head>
	<title>{m.register_verify_title()} · {m.feed_brand()}</title>
	<meta name="description" content={m.register_verify_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.register_verify_title()}</h1>
</header>

<div class="mx-auto flex w-full max-w-sm flex-col gap-4">
	{#if verifyError}
		<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
			{verifyError}
		</p>
	{:else}
		<p class="px-1 text-body text-ink-secondary">
			{m.register_verify_text({ email: data.email })}
		</p>
	{/if}

	<Button href="/conta/entrar" size="lg" full>{m.register_verify_login()}</Button>
</div>
