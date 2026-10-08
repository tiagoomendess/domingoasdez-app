<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * AdSense top anchors set `padding-top` on <body> to reserve space.
	 * Our `--content-top` already clears the status bar and floating chrome, so the two
	 * stack into a large empty gap. Toggle a root class when that padding is present.
	 */
	onMount(() => {
		const root = document.documentElement;
		const body = document.body;

		function sync() {
			const pad = parseFloat(getComputedStyle(body).paddingTop) || 0;
			const active = pad >= 40;
			root.classList.toggle('adsense-top-anchor', active);
			if (active) {
				root.style.setProperty('--adsense-top-pad', `${pad}px`);
			} else {
				root.style.removeProperty('--adsense-top-pad');
			}
		}

		sync();
		const observer = new MutationObserver(sync);
		observer.observe(body, { attributes: true, attributeFilter: ['style', 'class'] });
		const interval = setInterval(sync, 1000);

		return () => {
			observer.disconnect();
			clearInterval(interval);
			root.classList.remove('adsense-top-anchor');
			root.style.removeProperty('--adsense-top-pad');
		};
	});
</script>
