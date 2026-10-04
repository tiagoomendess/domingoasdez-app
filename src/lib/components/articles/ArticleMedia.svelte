<script lang="ts">
	import { m } from '#lib/messages.ts';

	type MediaType = 'image' | 'video' | 'youtube' | 'download' | 'other' | 'none';

	type Props = {
		type: MediaType;
		url?: string | null;
		thumbnailUrl?: string | null;
		youtubeId?: string | null;
		title?: string;
	};

	let { type, url = null, thumbnailUrl = null, youtubeId = null, title = '' }: Props = $props();
</script>

{#if type === 'image' && url}
	<img
		src={url}
		alt=""
		loading="lazy"
		decoding="async"
		class="aspect-video w-full rounded-inner bg-fill object-cover"
	/>
{:else if type === 'video' && url}
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		controls
		playsinline
		poster={thumbnailUrl ?? undefined}
		src={url}
		class="aspect-video w-full rounded-inner bg-fill object-cover"
	></video>
{:else if type === 'youtube' && youtubeId}
	<div class="aspect-video w-full overflow-hidden rounded-inner bg-fill">
		<iframe
			src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
			{title}
			loading="lazy"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			allowfullscreen
			class="h-full w-full border-0"
		></iframe>
	</div>
{:else if (type === 'download' || type === 'other') && url}
	<p class="text-callout">
		<a href={url} class="text-accent-text underline-offset-2 hover:underline"
			>{m.article_download()}</a
		>
	</p>
{/if}
