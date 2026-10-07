<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_ADSENSE_CLIENT } from '$app/env/public';
	import { isGoogleHost } from '#lib/google.ts';

	type Props = {
		adSlot: string;
		format?: string;
		fullWidth?: boolean;
	};

	let { adSlot, format = 'auto', fullWidth = true }: Props = $props();

	// Client-only so SSR HTML matches the first client paint (no `location` on the server).
	let enabled = $state(false);
	onMount(() => {
		enabled = Boolean(PUBLIC_ADSENSE_CLIENT) && isGoogleHost();
	});
</script>

{#if enabled}
	<aside class="overflow-hidden rounded-card" aria-label="Publicidade">
		<ins
			class="adsbygoogle"
			style="display:block"
			data-ad-client={PUBLIC_ADSENSE_CLIENT}
			data-ad-slot={adSlot}
			data-ad-format={format}
			data-full-width-responsive={fullWidth ? 'true' : 'false'}
			{@attach () => {
				try {
					(window.adsbygoogle = window.adsbygoogle || []).push({});
				} catch {
					// AdSense throws if the element was already filled
				}
			}}
		></ins>
	</aside>
{/if}
