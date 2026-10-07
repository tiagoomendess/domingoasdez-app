<script lang="ts">
	import type { PartnerAd } from '#lib/partners.ts';

	type Props = {
		partner: PartnerAd;
	};

	let { partner }: Props = $props();
</script>

<a
	href={partner.href}
	aria-label={partner.name}
	target="_blank"
	rel="sponsored noopener"
	data-sveltekit-reload
	data-sveltekit-preload-data="false"
	data-sveltekit-preload-code="false"
	class="block overflow-hidden rounded-inner outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
>
	<img
		src={partner.image}
		alt={partner.name}
		loading="lazy"
		decoding="async"
		class="h-auto w-full bg-fill"
	/>
</a>
