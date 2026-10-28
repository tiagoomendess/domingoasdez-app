<script lang="ts">
	import { m } from '#lib/messages.ts';
	import type { PlacardOverlay } from '#lib/placard.ts';

	type Props = {
		overlay: Extract<PlacardOverlay, { type: 'ad' }>;
		/** Server time now (ms), ticking. */
		now: number;
	};

	let { overlay, now }: Props = $props();

	const left = $derived(
		Math.min(1, Math.max(0, (overlay.endsAt - now) / (overlay.endsAt - overlay.startedAt)))
	);
</script>

<!--
	An ad break: the image as large as it fits, centred both ways (an ad the screen's shape fills
	it), over the screen's background, with a thin bar at the bottom running out until it ends.
-->
<div class="ad" role="img" aria-label={m.placard_ad_label()}>
	<img src={overlay.ad.image} alt="" />
	<div class="track" aria-hidden="true">
		<div class="bar" style:transform={`scaleX(${left})`}></div>
	</div>
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
		max-width: 100%;
		max-height: 100%;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.track {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		height: max(4px, 0.8cqmin);
		background: rgb(0 0 0 / 0.35);
	}

	.bar {
		height: 100%;
		background: var(--placard-accent);
		transform-origin: left;
	}
</style>
