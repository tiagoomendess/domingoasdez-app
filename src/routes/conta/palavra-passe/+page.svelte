<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formError = $derived(form?.errors?.form ?? null);
</script>

<svelte:head>
	<title>{m.password_change_title()} · {m.feed_brand()}</title>
	<meta name="description" content={m.password_change_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.password_change_title()}</h1>
</header>

{#key form ? JSON.stringify(form.errors) : 'idle'}
	<form method="POST" class="mx-auto flex w-full max-w-sm flex-col gap-4">
		{#if data.changed && !formError}
			<p class="rounded-field bg-success/10 px-4 py-3 text-subhead text-success" role="status">
				{m.password_change_success()}
			</p>
		{/if}

		{#if formError}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{formError}
			</p>
		{/if}

		<TextField
			label={m.password_change_current()}
			name="password_atual"
			type="password"
			autocomplete="current-password"
			required
			error={form?.errors?.password_atual}
		/>

		<TextField
			label={m.password_change_new()}
			name="nova_password"
			type="password"
			autocomplete="new-password"
			required
			error={form?.errors?.nova_password}
		/>

		<TextField
			label={m.password_change_confirm()}
			name="nova_password_confirmation"
			type="password"
			autocomplete="new-password"
			required
			error={form?.errors?.nova_password_confirmation}
		/>

		<Button type="submit" size="lg" full>{m.password_change_submit()}</Button>
	</form>
{/key}
