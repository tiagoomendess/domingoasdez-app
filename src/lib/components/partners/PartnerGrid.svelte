<script lang="ts">
	import PartnerLink from '#lib/components/partners/PartnerLink.svelte';
	import { m } from '#lib/messages.ts';
	import type { PartnerAd } from '#lib/partners.ts';

	type Props = {
		partners: PartnerAd[];
	};

	let { partners }: Props = $props();
</script>

{#if partners.length > 0}
	<section class="mt-8" aria-labelledby="partners-heading">
		<h2 id="partners-heading" class="px-1 text-title-3 text-ink">{m.partners_title()}</h2>
		<ul class="mt-3 grid grid-cols-2 gap-3">
			{#each partners as partner (partner.id)}
				<li>
					<PartnerLink {partner} />
				</li>
			{/each}
		</ul>
	</section>
{/if}
