<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let pin = $state('');

	const failedPin = $derived(form?.attemptedPin ?? data.attemptedPin);
</script>

<svelte:head>
	<title>{data.seo.title} · {m.feed_brand()}</title>
	<meta name="description" content={data.seo.description} />
</svelte:head>

<div class="mx-auto w-full max-w-sm">
	<section class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
		<p class="text-body text-ink-secondary">{m.flash_interview_pin_text()}</p>
		<form
			method="POST"
			class="mt-4 flex flex-col gap-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			{#if failedPin != null}
				<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
					{m.flash_interview_pin_error({ pin: failedPin })}
				</p>
			{/if}
			<TextField
				label={m.flash_interview_pin_label()}
				name="pin"
				bind:value={pin}
				inputmode="numeric"
				maxlength={4}
				autocomplete="one-time-code"
				required
				disabled={submitting}
			/>
			<Button type="submit" size="lg" full loading={submitting} disabled={submitting}>
				{m.flash_interview_pin_submit()}
			</Button>
		</form>
	</section>
</div>
