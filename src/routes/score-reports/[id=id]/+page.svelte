<script lang="ts">
	import { getLocale, m } from '#lib/messages.ts';
	import ScoreReportEditor from './ScoreReportEditor.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const seedKey = $derived(
		[
			data.gameId,
			form?.error ?? '',
			form?.homeScore ?? '',
			form?.awayScore ?? '',
			form?.finished ?? '',
			form?.banCreated ?? false
		].join(':')
	);

	const banned = $derived(data.ban != null || Boolean(form?.banCreated));
	const closed = $derived(!data.accepting);

	const banWhen = $derived.by(() => {
		if (!data.ban?.expiresAt) return '';
		return new Intl.DateTimeFormat(getLocale(), {
			day: 'numeric',
			month: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(data.ban.expiresAt));
	});

	const formError = $derived.by(() => {
		if (form?.banCreated) {
			if (data.ban) {
				return m.score_report_banned({
					when: banWhen,
					reason: data.ban.reason ?? ''
				});
			}
			return m.score_report_error_banned();
		}
		switch (form?.error) {
			case 'closed':
				return m.score_report_error_closed();
			case 'banned':
				return m.score_report_error_banned();
			case 'duplicate':
				return m.score_report_error_duplicate();
			case 'recent':
				return m.score_report_error_recent();
			case 'recent_ip':
				return m.score_report_error_recent_ip();
			case 'captcha':
				return m.score_report_error_captcha();
			case 'uuid':
				return m.score_report_error_uuid();
			case 'invalid':
			case 'not_found':
				return m.score_report_error_invalid();
			default:
				return null;
		}
	});
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.score_report_title()}</h1>
</header>

{#if formError}
	<p class="mb-4 rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
		{formError}
	</p>
{/if}

{#if closed && !banned}
	<p class="mb-4 rounded-field bg-fill px-4 py-3 text-subhead text-ink-secondary" role="status">
		{m.score_report_closed()}
	</p>
{:else if banned && data.ban}
	<p class="mb-4 rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
		{m.score_report_banned({ when: banWhen, reason: data.ban.reason ?? '' })}
	</p>
{/if}

<section class="overflow-hidden rounded-card bg-surface p-4 ring-1 ring-line sm:p-5 dark:ring-0">
	{#key seedKey}
		<ScoreReportEditor
			initialHome={form?.homeScore ?? data.homeScore}
			initialAway={form?.awayScore ?? data.awayScore}
			initialFinished={form?.finished ?? data.gameFinished}
			originalHome={data.homeScore}
			originalAway={data.awayScore}
			originalFinished={data.gameFinished}
			home={data.home}
			away={data.away}
			returnTo={data.returnTo}
			accepting={data.accepting}
			canFinish={data.canFinish}
			{banned}
			alreadySent={data.alreadySent}
			loggedIn={data.loggedIn}
			recaptchaSiteKey={data.recaptchaSiteKey}
		/>
	{/key}
</section>
