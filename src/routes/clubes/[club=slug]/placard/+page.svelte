<script lang="ts">
	import { tick } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon';
	import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon';
	import ImageIcon from 'phosphor-svelte/lib/ImageIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import MatchScene from '#lib/components/placard/MatchScene.svelte';
	import PlacardFrame from '#lib/components/placard/PlacardFrame.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { m } from '#lib/messages.ts';
	import {
		AD_MAX_BYTES,
		AD_MAX_SECONDS,
		AD_MIN_SECONDS,
		HALF_MS,
		MAX_ADS,
		type PlacardTheme
	} from '#lib/placard.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Edited here and previewed live; saved with "Guardar cores".
	// svelte-ignore state_referenced_locally
	let textColor = $state(data.look.textColor ?? data.defaults.textColor);
	// svelte-ignore state_referenced_locally
	let backgroundColor = $state(data.look.backgroundColor ?? data.defaults.backgroundColor);

	/** The 16:9 JPEG cut in the browser, waiting for "Guardar imagem". */
	let backgroundBlob = $state<Blob | null>(null);
	let backgroundPreview = $state<string | null>(null);
	let adError = $state<string | null>(null);
	let backgroundError = $state<string | null>(null);
	let busy = $state<string | null>(null);

	const previewTheme = $derived<PlacardTheme>({
		...data.theme,
		background: backgroundColor,
		backgroundImage: backgroundPreview ?? data.look.backgroundImage,
		foreground: textColor,
		muted: `color-mix(in srgb, ${textColor} 72%, transparent)`,
		accent: textColor
	});

	const sampleMatch = $derived({
		gameId: 0,
		home: { name: data.club.name, emblem: data.club.emblem },
		away: { name: m.placard_setup_sample_away(), emblem: data.club.emblem },
		homeScore: 2,
		awayScore: 1,
		clock: { elapsedMs: HALF_MS, runningSince: null, period: 'half_time' as const }
	});

	const durationOptions = Array.from({ length: AD_MAX_SECONDS - AD_MIN_SECONDS + 1 }, (_, i) => {
		const seconds = String(AD_MIN_SECONDS + i);
		return { value: seconds, label: m.placard_setup_seconds({ seconds }) };
	});

	const messageFor = (section: string) =>
		form?.section === section
			? (form.message ?? (form.saved ? m.placard_setup_saved() : null))
			: null;

	/** Shared `use:enhance`: marks the section busy and keeps the form values after saving. */
	const submit =
		(section: string, extra?: (data: FormData) => void): SubmitFunction =>
		({ formData }) => {
			busy = section;
			extra?.(formData);
			return async ({ update, result }) => {
				await update({ reset: false });
				busy = null;
				if (result.type === 'success' && section === 'background') clearBackground();
			};
		};

	function clearBackground() {
		if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
		backgroundBlob = null;
		backgroundPreview = null;
	}

	/** Cuts the photo to 16:9 around the centre at up to 1920×1080, honouring its rotation. */
	async function toBackgroundJpeg(file: File): Promise<Blob> {
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const width = Math.min(bitmap.width, (bitmap.height * 16) / 9);
		const height = (width * 9) / 16;
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(Math.min(width, 1920));
		canvas.height = Math.round((canvas.width * 9) / 16);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('canvas unavailable');
		context.drawImage(
			bitmap,
			(bitmap.width - width) / 2,
			(bitmap.height - height) / 2,
			width,
			height,
			0,
			0,
			canvas.width,
			canvas.height
		);
		bitmap.close();
		return new Promise((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
				'image/jpeg',
				0.9
			)
		);
	}

	async function pickBackground(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		backgroundError = null;
		try {
			clearBackground();
			backgroundBlob = await toBackgroundJpeg(file);
			backgroundPreview = URL.createObjectURL(backgroundBlob);
		} catch {
			backgroundError = m.placard_setup_error_invalid();
		}
	}

	/** Ads go up as they are; only the size is checked here, before a long upload fails. */
	function checkAd(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		adError = file && file.size > AD_MAX_BYTES ? m.placard_setup_error_too_large() : null;
		if (adError) event.currentTarget.value = '';
	}

	/** A new duration saves at once (the Select writes its hidden input first). */
	const durationForms: Record<number, HTMLFormElement> = {};
	const durationForm = (adId: number) => (node: HTMLFormElement) => {
		durationForms[adId] = node;
		return () => delete durationForms[adId];
	};
	async function submitDuration(adId: number) {
		await tick();
		durationForms[adId]?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{m.placard_setup_title()} · {data.club.name} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-title-1 text-ink">{m.placard_setup_title()}</h1>
	<p class="mt-1 text-subhead text-ink-secondary">
		{m.placard_setup_intro({ club: data.club.name })}
	</p>
</header>

<div class="space-y-6">
	<!-- Preview: what the TV shows at a home game -->
	<section aria-label={m.placard_setup_preview()}>
		<div class="aspect-video overflow-hidden rounded-card ring-1 ring-line">
			<PlacardFrame theme={previewTheme} class="h-full">
				<MatchScene match={sampleMatch} showNames now={0} />
			</PlacardFrame>
		</div>
		<p class="mt-2 px-1 text-footnote text-ink-tertiary">{m.placard_setup_preview_hint()}</p>
	</section>

	<!-- Colours -->
	<form
		method="POST"
		action="?/colors"
		use:enhance={submit('colors')}
		class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0"
	>
		<h2 class="text-headline text-ink">{m.placard_setup_colors()}</h2>
		<div class="mt-3 grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1.5">
				<span class="text-footnote font-semibold text-ink-secondary">
					{m.placard_setup_text_color()}
				</span>
				<input type="color" name="textColor" bind:value={textColor} class="color-input" />
			</label>
			<label class="flex flex-col gap-1.5">
				<span class="text-footnote font-semibold text-ink-secondary">
					{m.placard_setup_background_color()}
				</span>
				<input
					type="color"
					name="backgroundColor"
					bind:value={backgroundColor}
					class="color-input"
				/>
			</label>
		</div>
		{#if messageFor('colors')}
			<p class="mt-3 text-footnote text-ink-secondary" role="status">{messageFor('colors')}</p>
		{/if}
		<div class="mt-4 flex flex-wrap gap-2">
			<Button type="submit" loading={busy === 'colors'}>{m.placard_setup_save_colors()}</Button>
			<!-- A plain button: its name/value tells the action to go back to the default look. -->
			<button
				type="submit"
				name="reset"
				value="1"
				class="inline-flex h-11 pressable items-center rounded-full px-5 text-callout font-semibold text-accent-text hover:bg-fill"
				onclick={() => {
					textColor = data.defaults.textColor;
					backgroundColor = data.defaults.backgroundColor;
				}}
			>
				{m.placard_setup_reset_colors()}
			</button>
		</div>
	</form>

	<!-- Background image -->
	<section class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
		<h2 class="text-headline text-ink">{m.placard_setup_background()}</h2>
		<p class="mt-1 text-footnote text-ink-tertiary">{m.placard_setup_background_hint()}</p>

		{#if !data.uploads}
			<p class="mt-3 text-footnote text-danger">{m.placard_setup_error_unavailable()}</p>
		{:else}
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<label
					class="inline-flex h-11 pressable cursor-pointer items-center gap-2 rounded-full bg-accent-tint px-5 text-callout font-semibold text-accent-text"
				>
					<ImageIcon size={18} weight="bold" />
					{data.look.backgroundImage
						? m.placard_setup_change_image()
						: m.placard_setup_choose_image()}
					<input type="file" accept="image/*" class="sr-only" onchange={pickBackground} />
				</label>

				{#if backgroundBlob}
					<form
						method="POST"
						action="?/background"
						enctype="multipart/form-data"
						use:enhance={submit('background', (formData) =>
							formData.set('image', backgroundBlob!, 'background.jpg')
						)}
					>
						<Button type="submit" loading={busy === 'background'}>
							{m.placard_setup_save_image()}
						</Button>
					</form>
					<Button variant="plain" onclick={clearBackground}>{m.placard_cancel()}</Button>
				{:else if data.look.backgroundImage}
					<form method="POST" action="?/removeBackground" use:enhance={submit('background')}>
						<Button type="submit" variant="destructive" loading={busy === 'background'}>
							{m.placard_setup_remove_image()}
						</Button>
					</form>
				{/if}
			</div>
		{/if}
		{#if backgroundError ?? messageFor('background')}
			<p class="mt-3 text-footnote text-ink-secondary" role="status">
				{backgroundError ?? messageFor('background')}
			</p>
		{/if}
	</section>

	<!-- Ads -->
	<section class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
		<h2 class="text-headline text-ink">
			{m.placard_setup_ads()}
			<span class="text-ink-tertiary tabular-nums">({data.ads.length}/{MAX_ADS})</span>
		</h2>
		<p class="mt-1 text-footnote text-ink-tertiary">{m.placard_setup_ads_hint()}</p>

		{#if data.ads.length > 0}
			<ol class="mt-3 divide-y divide-line">
				{#each data.ads as ad, index (ad.id)}
					<li class="flex items-center gap-3 py-3">
						<span class="w-5 text-center text-footnote text-ink-tertiary tabular-nums">
							{index + 1}
						</span>
						<img
							src={ad.image}
							alt={m.placard_setup_ad_alt({ number: index + 1 })}
							class="aspect-video w-24 shrink-0 rounded-inner bg-black object-contain"
						/>
						<form
							method="POST"
							action="?/adDuration"
							use:enhance={submit('ads')}
							{@attach durationForm(ad.id)}
							class="min-w-0 flex-1"
						>
							<input type="hidden" name="id" value={ad.id} />
							<Select
								name="duration"
								label={m.placard_setup_ad_duration()}
								hideLabel
								options={durationOptions}
								value={String(ad.durationSeconds)}
								searchable={false}
								onchange={() => submitDuration(ad.id)}
							/>
						</form>
						<form method="POST" action="?/moveAd" use:enhance={submit('ads')} class="flex">
							<input type="hidden" name="id" value={ad.id} />
							<button
								type="submit"
								name="direction"
								value="up"
								class="grid size-11 pressable place-items-center rounded-full text-ink-secondary hover:bg-fill disabled:opacity-40"
								aria-label={m.placard_setup_ad_up()}
								disabled={index === 0}
							>
								<ArrowUpIcon size={18} weight="bold" />
							</button>
							<button
								type="submit"
								name="direction"
								value="down"
								class="grid size-11 pressable place-items-center rounded-full text-ink-secondary hover:bg-fill disabled:opacity-40"
								aria-label={m.placard_setup_ad_down()}
								disabled={index === data.ads.length - 1}
							>
								<ArrowDownIcon size={18} weight="bold" />
							</button>
						</form>
						<form
							method="POST"
							action="?/deleteAd"
							use:enhance={submit('ads')}
							onsubmit={(event) => {
								if (!confirm(m.placard_setup_ad_delete_confirm())) event.preventDefault();
							}}
						>
							<input type="hidden" name="id" value={ad.id} />
							<button
								type="submit"
								class="grid size-11 pressable place-items-center rounded-full text-danger hover:bg-fill"
								aria-label={m.placard_setup_ad_delete({ number: index + 1 })}
							>
								<TrashIcon size={18} weight="bold" />
							</button>
						</form>
					</li>
				{/each}
			</ol>
		{/if}

		{#if !data.uploads}
			<p class="mt-3 text-footnote text-danger">{m.placard_setup_error_unavailable()}</p>
		{:else if data.ads.length < MAX_ADS}
			<form
				method="POST"
				action="?/addAd"
				enctype="multipart/form-data"
				use:enhance={submit('ads')}
				class="mt-3 space-y-3 rounded-field bg-surface-muted p-3"
			>
				<label class="flex flex-col gap-1.5">
					<span class="text-footnote font-semibold text-ink-secondary">
						{m.placard_setup_ad_image()}
					</span>
					<input
						type="file"
						name="image"
						accept="image/png,image/jpeg,image/gif,image/webp"
						required
						onchange={checkAd}
						class="text-callout text-ink file:mr-3 file:rounded-full file:border-0 file:bg-accent-tint file:px-4 file:py-2 file:font-semibold file:text-accent-text"
					/>
				</label>
				<Select
					name="duration"
					label={m.placard_setup_ad_duration()}
					options={durationOptions}
					value={String(data.defaults.adSeconds)}
					searchable={false}
				/>
				<Button type="submit" loading={busy === 'ads'} full>{m.placard_setup_ad_add()}</Button>
			</form>
		{:else}
			<p class="mt-3 text-footnote text-ink-tertiary">{m.placard_setup_ads_full()}</p>
		{/if}
		{#if adError ?? messageFor('ads')}
			<p class="mt-3 text-footnote text-ink-secondary" role="status">
				{adError ?? messageFor('ads')}
			</p>
		{/if}
	</section>
</div>

<style>
	.color-input {
		height: 3.25rem;
		width: 100%;
		cursor: pointer;
		border-radius: var(--radius-field, 14px);
		background: var(--surface-muted);
		padding: 0.375rem;
	}
</style>
