<script lang="ts">
	import MapTrifoldIcon from 'phosphor-svelte/lib/MapTrifoldIcon';
	import NavigationArrowIcon from 'phosphor-svelte/lib/NavigationArrowIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { m } from '#lib/messages.ts';

	type Venue = {
		name: string;
		googleMapsUrl: string | null;
		wazeUrl: string | null;
	};

	type Props = {
		open: boolean;
		venue: Venue | null;
	};

	let { open = $bindable(false), venue }: Props = $props();

	const hasDirections = $derived(!!venue && (!!venue.googleMapsUrl || !!venue.wazeUrl));
</script>

<Sheet bind:open title={m.game_directions()}>
	{#if venue && hasDirections}
		<p class="text-callout text-ink-secondary">{m.game_directions_text()}</p>
		<p class="mt-2 text-headline text-ink">{venue.name}</p>

		<div class="mt-5 flex flex-col gap-3">
			{#if venue.googleMapsUrl}
				<Button href={venue.googleMapsUrl} variant="filled" full icon={MapTrifoldIcon}>
					{m.game_directions_maps()}
				</Button>
			{/if}
			{#if venue.wazeUrl}
				<Button href={venue.wazeUrl} variant="tinted" full icon={NavigationArrowIcon}>
					{m.game_directions_waze()}
				</Button>
			{/if}
		</div>
	{:else}
		<p class="text-callout text-ink-secondary">{m.game_directions_unknown()}</p>
		{#if venue}
			<p class="mt-2 text-headline text-ink">{venue.name}</p>
		{/if}
	{/if}
</Sheet>
