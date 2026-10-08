<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { PUBLIC_ADSENSE_CLIENT } from '$app/env/public';
	import type { AdShape } from '#lib/ads.ts';
	import { isGoogleHost } from '#lib/google.ts';

	type Props = {
		adSlot: string;
		shape?: AdShape;
		class?: string;
	};

	let { adSlot, shape = 'auto', class: className }: Props = $props();

	// Client-only so SSR HTML matches the first client paint (no `location` on the server).
	let enabled = $state(false);
	let unfilled = $state(false);

	const format = $derived(shape === 'horizontal' ? 'horizontal' : 'auto');
	const sizeClass = $derived(shape === 'horizontal' ? 'min-h-[90px]' : 'min-h-[250px]');
	const showAds = $derived(page.data.showAds !== false);

	onMount(() => {
		enabled = Boolean(PUBLIC_ADSENSE_CLIENT) && isGoogleHost();
	});
</script>

{#if enabled && showAds && adSlot && !unfilled}
	<aside class={['overflow-hidden rounded-card', sizeClass, className]} aria-label="Publicidade">
		<ins
			class="adsbygoogle block"
			style:display="block"
			data-ad-client={PUBLIC_ADSENSE_CLIENT}
			data-ad-slot={adSlot}
			data-ad-format={format}
			data-full-width-responsive="true"
			{@attach (node) => {
				try {
					(window.adsbygoogle = window.adsbygoogle || []).push({});
				} catch {
					// AdSense throws if the element was already filled
				}

				// Collapse when AdSense sets data-ad-status="unfilled".
				const sync = () => {
					if (node.getAttribute('data-ad-status') === 'unfilled') unfilled = true;
				};
				sync();
				const observer = new MutationObserver(sync);
				observer.observe(node, { attributes: true, attributeFilter: ['data-ad-status'] });
				return () => observer.disconnect();
			}}
		></ins>
	</aside>
{/if}
