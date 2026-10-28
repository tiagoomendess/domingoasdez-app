<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.placard_pair_title()} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-title-1 text-ink">{m.placard_pair_title()}</h1>
	<p class="mt-2 text-subhead text-ink-secondary">{m.placard_pair_code_intro()}</p>
</header>

<form method="POST" class="space-y-4 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
	<TextField
		name="code"
		label={m.placard_pair_code_label()}
		value={form?.code ?? ''}
		error={form?.error}
		autocomplete="off"
		autocapitalize="characters"
		spellcheck={false}
		maxlength={8}
		required
	/>
	<Button type="submit" size="lg" full>{m.placard_pair_code_submit()}</Button>
</form>
