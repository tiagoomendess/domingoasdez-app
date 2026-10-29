<script lang="ts">
	import { m } from '#lib/messages.ts';
	import type { PlacardOverlay } from '#lib/placard.ts';
	import OverlayProgress from './OverlayProgress.svelte';

	type Props = {
		overlay: Extract<PlacardOverlay, { type: 'ad' }>;
		/** Server time now (ms), ticking. */
		now: number;
	};

	let { overlay, now }: Props = $props();
</script>

<!--
	An ad break: the image as large as it fits, centred both ways (an ad the screen's shape fills
	it), over the screen's background, with a thin bar at the bottom running out until it ends.
-->
<div class="ad" role="img" aria-label={m.placard_ad_label()}>
	<img src={overlay.ad.image} alt="" />
	<OverlayProgress startedAt={overlay.startedAt} endsAt={overlay.endsAt} {now} />
</div>

<style>
	.ad {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: var(--placard-bg);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
