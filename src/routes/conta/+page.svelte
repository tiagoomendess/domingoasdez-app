<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import PreferencesGroup from '#lib/components/account/PreferencesGroup.svelte';
	import logo from '#lib/assets/logo.png';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const user = $derived(data.user);
</script>

<svelte:head>
	<title>{m.account_title()} · {m.feed_brand()}</title>
	<meta name="description" content={m.account_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.account_title()}</h1>
</header>

{#if user}
	<section
		class="mb-6 flex items-center gap-3.5 rounded-card bg-surface px-4 py-3.5 ring-1 ring-line dark:ring-0"
	>
		<Avatar name={user.name} src={user.picture} size={72} />
		<div class="min-w-0 flex-1">
			<h2 class="truncate text-headline text-ink">{user.name}</h2>
			<p class="truncate text-footnote text-ink-secondary">{user.email}</p>
		</div>
	</section>

	<div class="mb-6 space-y-6">
		<ListGroup>
			<ListRow title={m.account_profile()} href="/conta/perfil" />
		</ListGroup>

		{#if data.hasPassword}
			<ListGroup title={m.account_privacy_group()}>
				<ListRow title={m.account_change_password()} href="/conta/palavra-passe" />
			</ListGroup>
		{/if}

		<form method="POST" action="?/logout">
			<ListGroup>
				<ListRow
					title={m.account_logout()}
					destructive
					onclick={(event) => {
						event.preventDefault();
						(event.currentTarget as HTMLElement).closest('form')?.requestSubmit();
					}}
				/>
			</ListGroup>
		</form>
	</div>
{:else}
	<section
		class="mb-6 flex flex-col items-center rounded-card bg-surface px-5 py-8 text-center ring-1 ring-line dark:ring-0"
	>
		<div
			class="mb-4 flex size-[72px] items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-line"
		>
			<img src={logo} alt="" width="72" height="72" class="size-full object-contain p-1" />
		</div>
		<h2 class="text-title-2 text-ink">{m.account_hero_title()}</h2>
		<p class="mt-2 max-w-sm text-subhead text-ink-secondary">{m.account_hero_text()}</p>

		<div class="mt-6 flex w-full max-w-sm flex-col gap-3">
			<Button href="/conta/entrar" size="lg" full>{m.account_login()}</Button>
			<Button href="/conta/registar" variant="tinted" size="lg" full>{m.account_register()}</Button>
		</div>
	</section>
{/if}

<PreferencesGroup theme={data.preferences.theme} backButton={data.preferences.backButton} />
