<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import TextArea from '#lib/components/ui/TextArea.svelte';
	import { formatArticleDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const memberSince = $derived.by(() => {
		const raw = data.profile.memberSince;
		if (!raw) return null;
		const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
		if (Number.isNaN(date.getTime())) return null;
		return formatArticleDate(date.toISOString());
	});

	const phoneValue = $derived(form?.phone ?? data.profile.phone);
	const bioValue = $derived(form?.bio ?? data.profile.bio);
	const formError = $derived(form?.errors?.form ?? null);
</script>

<svelte:head>
	<title>{m.profile_title()} · {m.feed_brand()}</title>
	<meta name="description" content={m.profile_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.profile_title()}</h1>
</header>

<form method="POST" class="mx-auto flex w-full max-w-sm flex-col gap-4">
	{#if data.saved && !formError}
		<p class="rounded-field bg-success/10 px-4 py-3 text-subhead text-success" role="status">
			{m.profile_saved()}
		</p>
	{/if}

	{#if formError}
		<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
			{formError}
		</p>
	{/if}

	<TextField label={m.profile_name()} value={data.profile.name} readonly tabindex={-1} />

	<TextField
		label={m.profile_email()}
		type="email"
		value={data.profile.email}
		readonly
		tabindex={-1}
	/>

	<TextField
		label={m.profile_member_since()}
		value={memberSince ?? '—'}
		readonly
		tabindex={-1}
	/>

	<TextField
		label={m.profile_phone()}
		name="phone"
		type="tel"
		autocomplete="tel"
		value={phoneValue}
		error={form?.errors?.phone}
	/>

	<TextArea
		label={m.profile_bio()}
		name="bio"
		value={bioValue}
		error={form?.errors?.bio}
	/>

	<Button type="submit" size="lg" full>{m.profile_save()}</Button>
</form>
