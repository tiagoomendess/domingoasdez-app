<script lang="ts">
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
	import DirectionsButtons from '#lib/components/games/DirectionsButtons.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { m } from '#lib/messages.ts';

	type Venue = {
		name: string;
		/** The ground's page. */
		href: string;
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

		<div class="mt-5">
			<DirectionsButtons googleMapsUrl={venue.googleMapsUrl} wazeUrl={venue.wazeUrl} />
		</div>
	{:else}
		<p class="text-callout text-ink-secondary">{m.game_directions_unknown()}</p>
		{#if venue}
			<p class="mt-2 text-headline text-ink">{venue.name}</p>
		{/if}
	{/if}

	{#if venue}
		<div class="mt-3">
			<Button
				href={venue.href}
				variant="outline"
				full
				icon={InfoIcon}
				onclick={() => (open = false)}
			>
				{m.playground_view()}
			</Button>
		</div>
	{/if}
</Sheet>
