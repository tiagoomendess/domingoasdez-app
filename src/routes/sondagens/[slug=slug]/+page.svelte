<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
	import PartnerGrid from '#lib/components/partners/PartnerGrid.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Recaptcha from '#lib/components/ui/Recaptcha.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import { formatRelative, formatShortDate } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { POLL_COOKIE_MAX_AGE } from '#lib/polls.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const poll = $derived(data.poll);
	let submitting = $state(false);
	let picked = $state<string | null>(null);
	let captchaToken = $state('');
	let captchaEpoch = $state(0);
	const selected = $derived(picked ?? (form?.answerId != null ? String(form.answerId) : ''));
	const loginHref = $derived(`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname)}`);
	const ranked = $derived(
		[...poll.answers].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0) || a.id - b.id)
	);
	const leadingVotes = $derived(ranked[0]?.votes ?? 0);
	const percent = (votes = 0) =>
		poll.totalVotes ? Math.round((votes / poll.totalVotes) * 100) : 0;

	const formError = $derived.by(() => {
		switch (form?.error) {
			case 'captcha':
				return m.poll_error_captcha();
			case 'invalid':
				return m.poll_error_invalid();
			case 'generic':
				return m.poll_error_generic();
			default:
				return null;
		}
	});

	// Legacy pages copied `poll{id}` between the cookie and localStorage so a
	// cleared cookie still counted as a vote on the next visit.
	$effect(() => {
		const key = `poll${poll.id}`;
		const stored = localStorage.getItem(key);
		const cookie = document.cookie
			.split('; ')
			.find((part) => part.startsWith(`${key}=`))
			?.slice(key.length + 1);

		if (cookie && cookie !== stored) {
			localStorage.setItem(key, cookie);
			return;
		}
		if (!stored || cookie) return;

		const guard = `poll-sync-${poll.id}`;
		if (sessionStorage.getItem(guard)) return;
		sessionStorage.setItem(guard, '1');
		const secure = location.protocol === 'https:' ? '; secure' : '';
		document.cookie = `${key}=${stored}; path=/; max-age=${POLL_COOKIE_MAX_AGE}; samesite=lax${secure}`;
		location.reload();
	});
</script>

<svelte:head>
	<title>{m.poll_label()}: {poll.question} · {m.feed_brand()}</title>
	<meta name="description" content={m.poll_meta_description()} />
	<meta property="og:title" content="{m.poll_label()}: {poll.question}" />
	<meta property="og:description" content={m.poll_meta_description()} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={poll.image} />
</svelte:head>

<article class="space-y-4">
	<header class="px-1">
		<div class="flex items-center justify-between gap-3">
			<span class="inline-flex items-center gap-1.5 text-footnote font-semibold text-ink-secondary">
				<ChartBarHorizontalIcon size={16} weight="fill" />
				{m.poll_label()}
			</span>
			{#if poll.closed}
				<StatusPill status="closed" />
			{:else}
				<StatusPill status="open" label={m.poll_ends({ when: formatRelative(poll.endsAt) })} />
			{/if}
		</div>
		<h1 class="mt-3 text-title-1 text-ink">{poll.question}</h1>
	</header>

	<section class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
		{#if poll.state === 'results'}
			<ul class="space-y-2">
				{#each ranked as answer (answer.id)}
					<li class="relative overflow-hidden rounded-inner bg-fill">
						<span
							aria-hidden="true"
							class={[
								'absolute inset-y-0 left-0',
								(answer.votes ?? 0) > 0 && answer.votes === leadingVotes
									? 'bg-gold-400/45'
									: 'bg-fill-strong'
							]}
							style:width="{percent(answer.votes)}%"
						></span>
						<span class="relative flex items-center justify-between gap-3 px-3 py-3 text-body">
							<span
								class={[
									'text-ink',
									(answer.votes ?? 0) > 0 && answer.votes === leadingVotes && 'font-semibold'
								]}
							>
								{answer.label}
							</span>
							<span class="font-semibold text-ink tabular-nums">{percent(answer.votes)}%</span>
						</span>
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-footnote text-ink-tertiary">{m.poll_votes({ count: poll.totalVotes })}</p>
		{:else if poll.state === 'pending'}
			<p class="text-body text-ink-secondary">
				{m.poll_results_from({ date: formatShortDate(poll.resultsAt) })}
			</p>
		{:else}
			<form
				method="POST"
				class="flex flex-col gap-4"
				use:enhance={() => {
					submitting = true;
					return async ({ update, result }) => {
						await update();
						submitting = false;
						if (result.type === 'failure') {
							captchaToken = '';
							captchaEpoch += 1;
						}
					};
				}}
			>
				{#if formError}
					<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
						{formError}
					</p>
				{/if}

				<fieldset class="space-y-2">
					<legend class="sr-only">{m.poll_choose()}</legend>
					{#each poll.answers as answer (answer.id)}
						<label
							class="flex min-h-12 cursor-pointer items-center gap-3 rounded-inner bg-fill px-3 py-2.5 has-[:checked]:bg-accent-tint"
						>
							<input
								type="radio"
								name="answer"
								value={String(answer.id)}
								checked={selected === String(answer.id)}
								required
								class="size-5 border-0 text-accent focus:ring-2 focus:ring-accent"
								onchange={() => (picked = String(answer.id))}
							/>
							<span class="text-body text-ink">{answer.label}</span>
						</label>
					{/each}
				</fieldset>

				{#if poll.recaptchaSiteKey}
					<div class="space-y-2">
						{#key captchaEpoch}
							<Recaptcha
								siteKey={poll.recaptchaSiteKey}
								onsolved={(token) => (captchaToken = token)}
							/>
						{/key}
						<a href={loginHref} class="text-footnote font-medium text-accent-text hover:underline">
							{m.poll_login_captcha()}
						</a>
					</div>
				{/if}

				<Button
					type="submit"
					size="lg"
					full
					disabled={selected === '' ||
						submitting ||
						(!!poll.recaptchaSiteKey && captchaToken === '')}
					loading={submitting}
				>
					{m.poll_submit()}
				</Button>
			</form>
		{/if}
	</section>

	<p class="px-1 text-footnote text-ink-tertiary">
		{#if poll.closed}
			{m.poll_ended()}
		{:else}
			{m.poll_ends({ when: formatShortDate(poll.endsAt) })}
		{/if}
	</p>
</article>

<PartnerGrid partners={data.partners} />

{#if poll.editHref}
	<div class="mt-6">
		<ListGroup title={m.poll_admin()}>
			<ListRow title={m.poll_admin_edit()} href={poll.editHref} />
		</ListGroup>
	</div>
{/if}
