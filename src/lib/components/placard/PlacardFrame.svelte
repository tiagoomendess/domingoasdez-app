<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PlacardTheme } from '#lib/placard.ts';

	type Props = {
		theme: PlacardTheme | null;
		class?: string;
		children: Snippet;
	};

	let { theme, class: className, children }: Props = $props();
</script>

<!--
	The stadium screen's surface: the theme's colours and background image, and a size container
	so scenes and overlays size themselves with cq units. The TV fills the window with it; the
	club setup page shows a small 16:9 one as a preview.
-->
<div
	class={['frame', theme?.backgroundImage && 'with-image', className]}
	style:--placard-bg={theme?.background ?? '#08090b'}
	style:--placard-fg={theme?.foreground ?? '#f3f5f8'}
	style:--placard-muted={theme?.muted ?? '#a8b0bd'}
	style:--placard-accent={theme?.accent ?? '#5cb6ea'}
	style:background-image={theme?.backgroundImage ? `url("${theme.backgroundImage}")` : undefined}
>
	{@render children()}
</div>

<style>
	.frame {
		position: relative;
		container-type: size;
		overflow: hidden;
		/* A 16:9 image covering any screen: upscaled if needed, never letterboxed. */
		background-color: var(--placard-bg);
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
		color: var(--placard-fg);
		font-family: var(--font-sans);
	}

	/* Text stays readable over a photo. */
	.with-image {
		text-shadow: 0 0.03em 0.12em rgb(0 0 0 / 0.45);
	}
</style>
