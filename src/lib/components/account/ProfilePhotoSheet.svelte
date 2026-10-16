<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import type { ActionResult } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CameraIcon from 'phosphor-svelte/lib/CameraIcon';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { m } from '#lib/messages.ts';

	type Props = { name: string; src: string | null; open: boolean };

	let { name, src, open = $bindable(false) }: Props = $props();

	/** Square crop sent to the server, which re-encodes it to 400 px. */
	const CROP_SIZE = 800;

	let fileInput = $state<HTMLInputElement>();
	let blob = $state<Blob | null>(null);
	let previewUrl = $state<string | null>(null);
	let error = $state<string | null>(null);
	let busy = $state(false);

	function reset() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		blob = null;
		error = null;
	}

	$effect(() => {
		if (!open) reset();
	});

	/** Centre-crops to a square, honouring the photo's EXIF rotation. */
	async function toSquareJpeg(file: File): Promise<Blob> {
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const side = Math.min(bitmap.width, bitmap.height);
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = Math.min(side, CROP_SIZE);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('canvas unavailable');
		context.fillStyle = '#fff';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.drawImage(
			bitmap,
			(bitmap.width - side) / 2,
			(bitmap.height - side) / 2,
			side,
			side,
			0,
			0,
			canvas.width,
			canvas.height
		);
		bitmap.close();
		return new Promise((resolve, reject) =>
			canvas.toBlob(
				(result) => (result ? resolve(result) : reject(new Error('encode failed'))),
				'image/jpeg',
				0.9
			)
		);
	}

	async function onpick(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		reset();
		try {
			blob = await toSquareJpeg(file);
			previewUrl = URL.createObjectURL(blob);
		} catch {
			error = m.account_photo_error_invalid();
		}
	}

	function onresult() {
		return async ({ result }: { result: ActionResult }) => {
			busy = false;
			if (result.type === 'success') {
				await invalidateAll();
				open = false;
			} else if (result.type === 'failure') {
				error = (result.data?.pictureError as string | undefined) ?? m.account_photo_error_failed();
			} else {
				await applyAction(result);
			}
		};
	}
</script>

<Sheet bind:open title={m.account_photo_title()}>
	<div class="flex flex-col items-center gap-5 pb-2 text-center">
		{#if previewUrl}
			<img
				src={previewUrl}
				alt=""
				width="128"
				height="128"
				class="size-32 rounded-full object-cover ring-1 ring-line"
			/>
			<p class="text-footnote text-ink-tertiary">{m.account_photo_hint()}</p>
		{:else}
			<Avatar {name} {src} size={128} />
		{/if}

		{#if error}
			<p class="w-full rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{error}
			</p>
		{/if}

		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			class="sr-only"
			tabindex="-1"
			aria-hidden="true"
			onchange={onpick}
		/>

		<div class="flex w-full flex-col gap-3">
			{#if blob}
				<form
					method="POST"
					action="?/picture"
					enctype="multipart/form-data"
					use:enhance={({ formData }) => {
						formData.set('photo', blob!, 'avatar.jpg');
						busy = true;
						error = null;
						return onresult();
					}}
				>
					<Button type="submit" size="lg" full loading={busy}>{m.account_photo_save()}</Button>
				</form>
				<Button variant="tinted" size="lg" full onclick={() => fileInput?.click()}>
					{m.account_photo_other()}
				</Button>
			{:else}
				<Button size="lg" full icon={CameraIcon} onclick={() => fileInput?.click()}>
					{src ? m.account_photo_change() : m.account_photo_choose()}
				</Button>
				{#if src}
					<form
						method="POST"
						action="?/removePicture"
						use:enhance={() => {
							busy = true;
							error = null;
							return onresult();
						}}
					>
						<Button type="submit" variant="plain" size="lg" full loading={busy}>
							{m.account_photo_remove()}
						</Button>
					</form>
				{/if}
			{/if}
		</div>
	</div>
</Sheet>
