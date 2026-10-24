<script lang="ts">
	import MapTrifoldIcon from 'phosphor-svelte/lib/MapTrifoldIcon';
	import NavigationArrowIcon from 'phosphor-svelte/lib/NavigationArrowIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import { m } from '#lib/messages.ts';

	type Props = {
		googleMapsUrl: string | null;
		wazeUrl: string | null;
	};

	let { googleMapsUrl, wazeUrl }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	{#if googleMapsUrl}
		<Button href={googleMapsUrl} variant="filled" full icon={MapTrifoldIcon}>
			{m.game_directions_maps()}
		</Button>
	{/if}
	{#if wazeUrl}
		<Button href={wazeUrl} variant="tinted" full icon={NavigationArrowIcon}>
			{m.game_directions_waze()}
		</Button>
	{/if}
</div>
