<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Recaptcha from '#lib/components/ui/Recaptcha.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextArea from '#lib/components/ui/TextArea.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { formatArticleDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let anonymousOverride = $state<boolean | null>(null);
	const anonymous = $derived(anonymousOverride ?? !data.loggedIn);
	let content = $state('');
	let source = $state('');
	let sending = $state(false);
	let captchaToken = $state('');
	let captchaEpoch = $state(0);
	let copied = $state(false);
	let deleteOpen = $state(false);
	let pendingCode = $state<string | null>(null);

	// Keep local draft unless a failed submit echoed values back.
	// Note: never read-then-write the same state here (e.g. `epoch += 1`);
	// that subscribes the effect to its own write and loops until
	// `effect_update_depth_exceeded` blows up the page. Widget resets live
	// in the enhance callback below instead.
	$effect(() => {
		if (form?.action === 'send' && !form?.sent) {
			content = typeof form?.content === 'string' ? form.content : '';
			source = typeof form?.source === 'string' ? form.source : '';
		} else if (form?.action === 'send' && form?.sent) {
			content = '';
			source = '';
			captchaToken = '';
		}
	});

	const sendError = $derived.by(() => {
		if (form?.action !== 'send' || form?.sent) return null;
		switch (form?.error) {
			case 'content':
				return m.info_error_content();
			case 'source':
				return m.info_error_source();
			case 'captcha':
				return m.info_error_captcha();
			case 'code':
				return m.info_error_code();
			default:
				return null;
		}
	});

	const sentCode = $derived(
		form?.action === 'send' && form?.sent ? (form.code as string) : data.justSent?.code
	);
	const sentAnonymous = $derived(
		form?.action === 'send' && form?.sent
			? Boolean(form.anonymous)
			: (data.justSent?.anonymous ?? true)
	);

	const lookupResult = $derived(
		form?.action === 'lookup' && form?.lookup ? form.lookup : data.lookup
	);
	const lookupMissing = $derived.by(() => {
		if (form?.action === 'lookup' && !form?.lookup) {
			const missing =
				typeof form?.lookupMissing === 'string' && form.lookupMissing
					? form.lookupMissing
					: typeof form?.code === 'string' && form.code
						? form.code.trim().toUpperCase()
						: '';
			return m.info_lookup_missing({ code: missing });
		}
		if (data.lookupMissing && !data.lookup) {
			return m.info_lookup_missing({ code: data.lookupMissing });
		}
		return null;
	});

	const deleteError = $derived.by(() => {
		if (form?.action !== 'delete' || form?.deleted) return null;
		switch (form?.error) {
			case 'forbidden':
				return m.info_error_forbidden();
			default:
				return m.info_error_missing();
		}
	});
	const justDeleted = $derived(form?.action === 'delete' && form?.deleted);

	// Close the confirmation sheet once the delete resolves (success or
	// failure) — the outcome is shown inline in the page below. Only reads
	// `form` here so the effect can't loop on its own writes.
	$effect(() => {
		if (form?.action === 'delete' && (form?.deleted || form?.error)) {
			deleteOpen = false;
			pendingCode = null;
		}
	});

	function formatDate(raw: string | null) {
		if (!raw) return '—';
		const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
		if (Number.isNaN(date.getTime())) return '—';
		return formatArticleDate(date.toISOString());
	}

	function statusLabel(status: string) {
		switch (status) {
			case 'seen':
				return m.info_status_seen();
			case 'used':
				return m.info_status_used();
			case 'archived':
				return m.info_status_archived();
			default:
				return m.info_status_sent();
		}
	}

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	function askDelete(code: string) {
		pendingCode = code;
		deleteOpen = true;
	}

	const loginHref = $derived(`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname)}`);
	const showCaptcha = $derived(!data.loggedIn && Boolean(data.recaptchaSiteKey));
	const canSend = $derived(
		!sending &&
			content.trim().length > 0 &&
			source.trim().length > 0 &&
			(!showCaptcha || captchaToken !== '')
	);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.info_title()}</h1>
	<p class="mt-2 text-subhead text-ink-secondary">{m.info_intro()}</p>
</header>

<div class="space-y-6">
	<section class="rounded-card bg-surface p-4 ring-1 ring-line sm:p-5 dark:ring-0">
		{#if sentCode}
			<div class="flex flex-col gap-3" role="status">
				<p class="rounded-field bg-success/10 px-4 py-3 text-subhead text-success">
					{sentAnonymous
						? m.info_success_anonymous({ code: sentCode })
						: m.info_success_identified()}
				</p>
				{#if sentAnonymous}
					<div
						class="flex items-center justify-between gap-3 rounded-field bg-surface-muted px-4 py-3"
					>
						<div class="min-w-0">
							<p class="text-footnote font-semibold text-ink-secondary">{m.info_code_label()}</p>
							<p class="truncate text-headline tracking-widest text-ink tabular-nums">{sentCode}</p>
						</div>
						<Button variant="tinted" onclick={() => copyCode(sentCode)}>
							{copied ? m.info_code_copied() : m.info_code_copy()}
						</Button>
					</div>
				{/if}
			</div>
		{/if}

		<form
			method="POST"
			action="?/send"
			class="mt-4 flex flex-col gap-4"
			use:enhance={() => {
				sending = true;
				return async ({ update, result }) => {
					await update();
					sending = false;
					// The captcha token is single-use: refresh the widget after every
					// submit so a second send never reuses a consumed token.
					// (Bumping the counter here is safe — this is an event callback,
					// not an $effect.)
					if (result.type === 'failure' || result.type === 'success') {
						captchaToken = '';
						captchaEpoch += 1;
					}
				};
			}}
		>
			{#if sendError}
				<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
					{sendError}
				</p>
			{/if}

			<input type="hidden" name="anonymous" value={anonymous ? 'true' : 'false'} />
			<div class="flex min-h-11 items-center justify-between gap-3 px-1">
				<div>
					<p class="text-body font-medium text-ink">{m.info_anonymous()}</p>
					<p class="text-footnote text-ink-tertiary">
						{data.loggedIn ? m.info_anonymous_helper_user() : m.info_anonymous_helper_guest()}
					</p>
				</div>
				<Switch
					checked={anonymous}
					label={m.info_anonymous()}
					disabled={!data.loggedIn || sending}
					onchange={(checked) => (anonymousOverride = checked)}
				/>
			</div>

			<TextArea
				label={m.info_content()}
				name="content"
				rows={4}
				maxlength={500}
				required
				autocomplete="off"
				helper={m.info_content_helper()}
				bind:value={content}
			/>

			<TextField
				label={m.info_source()}
				name="source"
				maxlength={155}
				required
				autocomplete="off"
				helper={m.info_source_helper()}
				bind:value={source}
			/>

			{#if showCaptcha && data.recaptchaSiteKey}
				<div class="space-y-2">
					{#key captchaEpoch}
						<Recaptcha
							siteKey={data.recaptchaSiteKey}
							onsolved={(token) => (captchaToken = token)}
						/>
					{/key}
					<input type="hidden" name="g-recaptcha-response" value={captchaToken} />
					<a href={loginHref} class="text-footnote font-medium text-accent-text hover:underline">
						{m.info_login_captcha()}
					</a>
				</div>
			{/if}

			<Button type="submit" size="lg" full disabled={!canSend} loading={sending}>
				{m.info_send()}
			</Button>
		</form>
	</section>

	<section class="rounded-card bg-surface p-4 ring-1 ring-line sm:p-5 dark:ring-0">
		<h2 class="text-headline text-ink">{m.info_lookup_title()}</h2>
		<p class="mt-1 text-subhead text-ink-secondary">{m.info_lookup_text()}</p>

		<form method="POST" action="?/lookup" class="mt-4 flex flex-col gap-3" use:enhance>
			<TextField
				label={m.info_lookup_label()}
				name="code"
				maxlength={9}
				required
				autocomplete="off"
			/>
			<Button type="submit" variant="tinted" size="lg" full>{m.info_lookup_button()}</Button>
		</form>

		{#if lookupMissing}
			<p class="mt-3 rounded-field bg-fill px-4 py-3 text-subhead text-ink-secondary" role="status">
				{lookupMissing}
			</p>
		{/if}

		{#if lookupResult}
			<article class="mt-4 rounded-field bg-surface-muted p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-headline tracking-widest text-ink tabular-nums">{lookupResult.code}</p>
					<span
						class={[
							'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap',
							lookupResult.status === 'sent'
								? 'bg-accent-tint text-accent-text'
								: 'bg-fill text-ink-secondary'
						]}
					>
						{statusLabel(lookupResult.status)}
					</span>
				</div>
				<p class="mt-1 text-footnote text-ink-tertiary">{formatDate(lookupResult.createdAt)}</p>
				<p class="mt-3 text-body text-ink">{lookupResult.content}</p>
				{#if lookupResult.mine}
					<div class="mt-3">
						<Button variant="destructive" onclick={() => askDelete(lookupResult.code)}>
							{m.info_delete()}
						</Button>
					</div>
				{/if}
			</article>
		{/if}
	</section>

	{#if data.loggedIn}
		<section>
			<h2 class="mb-2 px-4 text-footnote font-semibold text-ink-secondary">
				{m.info_mine_title()}
			</h2>
			{#if justDeleted}
				<p
					class="mb-3 rounded-field bg-success/10 px-4 py-3 text-subhead text-success"
					role="status"
				>
					{m.info_deleted()}
				</p>
			{/if}
			{#if deleteError}
				<p class="mb-3 rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
					{deleteError}
				</p>
			{/if}
			{#if data.mine.length > 0}
				<ListGroup>
					{#each data.mine as info (info.code)}
						<ListRow
							title={info.code}
							subtitle={info.content}
							value={statusLabel(info.status)}
							onclick={() => askDelete(info.code)}
						/>
					{/each}
				</ListGroup>
			{:else}
				<p
					class="rounded-card bg-surface px-4 py-5 text-center text-subhead text-ink-secondary ring-1 ring-line dark:ring-0"
				>
					{m.info_mine_empty()}
				</p>
			{/if}
		</section>
	{/if}
</div>

<Sheet bind:open={deleteOpen} title={m.info_delete_title()}>
	<p class="text-body text-ink-secondary">{m.info_delete_text()}</p>
	{#if pendingCode}
		<p class="mt-2 text-headline tracking-widest text-ink tabular-nums">{pendingCode}</p>
	{/if}
	<form method="POST" action="?/delete" class="mt-5 flex gap-3" use:enhance>
		<input type="hidden" name="code" value={pendingCode ?? ''} />
		<Button variant="outline" full onclick={() => (deleteOpen = false)}>
			{m.info_delete_cancel()}
		</Button>
		<Button variant="destructive" type="submit" full>{m.info_delete_confirm()}</Button>
	</form>
</Sheet>
