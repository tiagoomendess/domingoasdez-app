<script lang="ts">
	import PartnerLink from '#lib/components/partners/PartnerLink.svelte';
	import { m } from '#lib/messages.ts';
	import type { PartnerAd } from '#lib/partners.ts';

	type Props = {
		partner: PartnerAd;
	};

	let { partner }: Props = $props();
</script>

<aside
	class="rounded-card bg-surface p-2.5 ring-1 ring-line outline-accent transition-transform duration-(--dur-press) ease-snappy has-[a:active]:scale-98 motion-reduce:has-[a:active]:scale-100 dark:ring-0"
>
	<p class="px-1.5 pb-2 text-caption text-ink-tertiary">{m.partner_label()}</p>
	<PartnerLink {partner} />
</aside>
