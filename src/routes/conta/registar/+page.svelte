<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import Recaptcha from '#lib/components/ui/Recaptcha.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let captchaToken = $state('');
	let captchaEpoch = $state(0);

	const formError = $derived(form?.errors?.form ?? form?.errors?.captcha ?? null);
	const captchaRequired = $derived(Boolean(data.recaptchaSiteKey));
	const canSubmit = $derived(!captchaRequired || captchaToken !== '');
</script>

<svelte:head>
	<title>{m.register_title()} · {m.feed_brand()}</title>
	<meta name="description" content={m.register_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.register_title()}</h1>
</header>

<form
	method="POST"
	class="mx-auto flex w-full max-w-sm flex-col gap-4"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			captchaToken = '';
			captchaEpoch += 1;
		};
	}}
>
	{#if formError}
		<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
			{formError}
		</p>
	{/if}

	<TextField
		label={m.register_name()}
		name="name"
		type="text"
		autocomplete="name"
		required
		value={form?.name ?? ''}
		error={form?.errors?.name}
	/>

	<TextField
		label={m.register_email()}
		name="email"
		type="email"
		autocomplete="email"
		required
		value={form?.email ?? ''}
		error={form?.errors?.email}
	/>

	<TextField
		label={m.register_password()}
		name="password"
		type="password"
		autocomplete="new-password"
		required
		error={form?.errors?.password}
	/>

	<TextField
		label={m.register_password_confirmation()}
		name="password_confirmation"
		type="password"
		autocomplete="new-password"
		required
		error={form?.errors?.password_confirmation}
	/>

	<div class="flex flex-col gap-1">
		<label class="flex min-h-11 items-start gap-3 px-1">
			<input
				type="checkbox"
				name="terms"
				checked={form?.terms ?? false}
				required
				class="mt-0.5 size-5 shrink-0 rounded border-0 bg-surface-muted text-accent focus:ring-2 focus:ring-accent"
			/>
			<span class="text-body text-ink">
				{m.register_terms_before()}
				<a href="/termos-e-condicoes" class="font-medium text-accent-text hover:underline">
					{m.pages_terms()}
				</a>
				{m.register_terms_and()}
				<a href="/politica-de-privacidade" class="font-medium text-accent-text hover:underline">
					{m.pages_privacy()}
				</a>.
			</span>
		</label>
		{#if form?.errors?.terms}
			<p class="px-1 text-footnote text-danger">{form.errors.terms}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-1">
		<label class="flex min-h-11 items-start gap-3 px-1">
			<input
				type="checkbox"
				name="rgpd"
				checked={form?.rgpd ?? false}
				required
				class="mt-0.5 size-5 shrink-0 rounded border-0 bg-surface-muted text-accent focus:ring-2 focus:ring-accent"
			/>
			<span class="text-body text-ink">{m.register_rgpd()}</span>
		</label>
		{#if form?.errors?.rgpd}
			<p class="px-1 text-footnote text-danger">{form.errors.rgpd}</p>
		{/if}
	</div>

	{#if data.recaptchaSiteKey}
		<div class="space-y-2">
			{#key captchaEpoch}
				<Recaptcha siteKey={data.recaptchaSiteKey} onsolved={(token) => (captchaToken = token)} />
			{/key}
			{#if captchaToken}
				<input type="hidden" name="g-recaptcha-response" value={captchaToken} />
			{/if}
			{#if form?.errors?.captcha && !form?.errors?.form}
				<p class="px-1 text-footnote text-danger">{form.errors.captcha}</p>
			{/if}
		</div>
	{/if}

	<Button type="submit" size="lg" full disabled={!canSubmit}>{m.register_submit()}</Button>

	<p class="px-1 text-center text-subhead text-ink-secondary">
		{m.register_have_account()}
		<a href="/conta/entrar" class="font-medium text-accent-text hover:underline">
			{m.register_login_link()}
		</a>
	</p>
</form>
