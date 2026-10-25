<script lang="ts">
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { m } from '#lib/messages.ts';

	type Format = 'quadrado' | 'story';

	type Props = {
		gameId: number;
	};

	let { gameId }: Props = $props();

	let busy = $state<Format | null>(null);
	let failed = $state(false);

	/** `attachment; filename=x.jpg` → `x.jpg`. */
	function fileName(disposition: string | null, format: Format): string {
		const match = /filename="?([^";]+)"?/i.exec(disposition ?? '');
		return match?.[1] ?? `jogo-${gameId}-${format}.jpg`;
	}

	// Fetched rather than linked, so the row can show progress while the server draws the image.
	async function download(format: Format) {
		if (busy) return;
		busy = format;
		failed = false;
		try {
			const res = await fetch(`/api/jogos/${gameId}/imagem?formato=${format}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const url = URL.createObjectURL(await res.blob());
			const link = document.createElement('a');
			link.href = url;
			link.download = fileName(res.headers.get('content-disposition'), format);
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		} catch {
			failed = true;
		} finally {
			busy = null;
		}
	}
</script>

{#snippet status(format: Format)}
	{#if busy === format}
		<span
			role="status"
			aria-label={m.game_image_generating()}
			class="size-5 shrink-0 animate-spin rounded-full border-2 border-accent border-r-transparent"
		></span>
	{:else}
		<DownloadSimpleIcon size={20} class="shrink-0 text-accent-text" />
	{/if}
{/snippet}

<ListGroup title={m.game_image_title()} footer={failed ? m.game_image_error() : undefined}>
	<ListRow
		title={m.game_image_square()}
		subtitle={m.game_image_square_hint()}
		chevron={false}
		onclick={() => download('quadrado')}
	>
		{#snippet trailing()}
			{@render status('quadrado')}
		{/snippet}
	</ListRow>
	<ListRow
		title={m.game_image_story()}
		subtitle={m.game_image_story_hint()}
		chevron={false}
		onclick={() => download('story')}
	>
		{#snippet trailing()}
			{@render status('story')}
		{/snippet}
	</ListRow>
</ListGroup>
