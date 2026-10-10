<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/ui/Button.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const notifications = $derived(data.notifications);

	// Snapshot the server data once for input initial values (plain const, so
	// the initializers below never capture reactive state).
	const initial = data.notifications;

	let enabled = $state(initial.notificationsEnabled);
	let email = $state(initial.contactEmail);
	let submitting = $state(false);

	// Echo a failed submission back into the email field. Reads `form` only
	// and writes `email` only, so it can never read-then-write the same state.
	$effect(() => {
		const failed = form?.contactEmail;
		if (failed != null) email = failed;
	});
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<article class="space-y-4">
	<p class="px-1 text-body text-ink-secondary">
		{m.flash_interview_notif_text({ club: notifications.clubName })}
	</p>

	<form
		method="POST"
		class="space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		<input type="hidden" name="pin" value={data.pin} />
		<input type="hidden" name="notifications_enabled" value={enabled ? 'true' : 'false'} />

		{#if form?.error === 'invalid_email'}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{m.flash_interview_notif_error_email()}
			</p>
		{/if}

		<section class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			<label class="flex min-h-11 items-center justify-between gap-3 px-1">
				<span class="text-body text-ink">
					{m.flash_interview_notif_enabled()}
				</span>
				<Switch
					bind:checked={enabled}
					label={m.flash_interview_notif_enabled()}
					disabled={submitting}
				/>
			</label>
		</section>

		<section class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			<TextField
				label={m.flash_interview_notif_email()}
				name="contact_email"
				type="email"
				required
				maxlength={64}
				bind:value={email}
				disabled={submitting}
			/>
		</section>

		<Button type="submit" size="lg" full loading={submitting} disabled={submitting}>
			{m.flash_interview_save()}
		</Button>
	</form>

	<p class="px-1 text-footnote text-ink-tertiary">{m.flash_interview_notif_note()}</p>
</article>
