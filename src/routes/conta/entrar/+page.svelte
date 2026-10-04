<script lang="ts">
	import GoogleLogoIcon from 'phosphor-svelte/lib/GoogleLogoIcon';
	import FacebookLogoIcon from 'phosphor-svelte/lib/FacebookLogoIcon';
	import AppleLogoIcon from 'phosphor-svelte/lib/AppleLogoIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { m } from '#lib/messages.ts';
	import type { Icon } from '#lib/components/types.ts';
	import type { SocialProvider } from '#lib/auth/social.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const socialMeta: Record<SocialProvider, { label: () => string; icon: Icon }> = {
		google: { label: m.account_login_with_google, icon: GoogleLogoIcon },
		facebook: { label: m.account_login_with_facebook, icon: FacebookLogoIcon },
		apple: { label: m.account_login_with_apple, icon: AppleLogoIcon }
	};

	const formError = $derived(
		form?.error === 'throttled'
			? m.login_throttled()
			: form?.error === 'invalid'
				? m.login_error()
				: null
	);

	const socialError = $derived.by(() => {
		switch (data.socialError) {
			case 'missing_email':
				return m.login_social_missing_email();
			case 'unverified_email':
				return m.login_social_unverified();
			case 'no_account':
				return m.login_social_no_account();
			case 'unconfigured':
				return m.login_social_unconfigured();
			case 'error':
			case 'banned':
			case 'state':
				return m.login_social_error();
			default:
				return null;
		}
	});

	const verifiedSuccess = $derived(data.verified && !formError && !socialError);
</script>

<svelte:head>
	<title>{m.login_title()} · {m.feed_brand()}</title>
	<meta name="description" content={m.login_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.login_title()}</h1>
</header>

{#key form?.error ?? 'idle'}
	<form method="POST" class="mx-auto flex w-full max-w-sm flex-col gap-4">
		{#if verifiedSuccess}
			<p class="rounded-field bg-success/10 px-4 py-3 text-subhead text-success" role="status">
				{m.login_verified()}
			</p>
		{/if}

		{#if formError || socialError}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{formError ?? socialError}
			</p>
		{/if}

		<TextField
			label={m.login_email()}
			name="email"
			type="email"
			autocomplete="username"
			required
			value={form?.email ?? ''}
		/>

		<TextField
			label={m.login_password()}
			name="password"
			type="password"
			autocomplete="current-password"
			required
		/>

		<label class="flex min-h-11 items-center gap-3 px-1">
			<input
				type="checkbox"
				name="remember"
				checked={form?.remember ?? false}
				class="size-5 rounded border-0 bg-surface-muted text-accent focus:ring-2 focus:ring-accent"
			/>
			<span class="text-body text-ink">{m.login_remember()}</span>
		</label>

		<input type="hidden" name="redirectTo" value="/conta" />

		<Button type="submit" size="lg" full>{m.login_submit()}</Button>
	</form>
{/key}

{#if data.socialProviders.length > 0}
	<div class="mx-auto mt-6 flex w-full max-w-sm items-center gap-3" aria-hidden="true">
		<span class="h-px flex-1 bg-line"></span>
		<span class="text-footnote text-ink-tertiary">{m.account_or()}</span>
		<span class="h-px flex-1 bg-line"></span>
	</div>

	<div class="mx-auto mt-4 flex w-full max-w-sm flex-col gap-3">
		{#each data.socialProviders as provider (provider)}
			{@const meta = socialMeta[provider]}
			<Button href="/conta/entrar/{provider}" variant="outline" size="lg" full icon={meta.icon}>
				{meta.label()}
			</Button>
		{/each}
	</div>
{/if}
