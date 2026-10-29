<script lang="ts">
	type Props = {
		startedAt: number;
		endsAt: number;
		/** Server time now (ms), ticking. */
		now: number;
	};

	let { startedAt, endsAt, now }: Props = $props();

	const left = $derived(Math.min(1, Math.max(0, (endsAt - now) / (endsAt - startedAt))));
</script>

<!-- A thin bar along the bottom of an overlay, running out until it ends. -->
<div class="track" aria-hidden="true">
	<div class="bar" style:transform={`scaleX(${left})`}></div>
</div>

<style>
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
