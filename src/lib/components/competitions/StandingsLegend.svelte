<script lang="ts">
	import { m } from '#lib/messages.ts';
	import type { LegendItem } from '#lib/standings.ts';

	type Props = {
		items: LegendItem[];
	};

	let { items }: Props = $props();

	function labelFor(item: LegendItem): string {
		switch (item.label) {
			case 'champion':
				return m.competition_legend_champion();
			case 'promotion':
				return m.competition_legend_promotion();
			case 'relegation':
				return m.competition_legend_relegation();
			default:
				return item.label;
		}
	}
</script>

{#if items.length > 0}
	<div class="mt-3 space-y-2 px-1">
		<p class="text-footnote font-semibold text-ink-secondary">{m.competition_legend()}</p>
		<ul class="flex flex-wrap gap-2">
			{#each items as item (item.label + item.color)}
				<li
					class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium text-ink"
					style:background-color="color-mix(in srgb, {item.color} 22%, transparent)"
				>
					<span
						aria-hidden="true"
						class="size-2 shrink-0 rounded-full"
						style:background-color={item.color}
					></span>
					{labelFor(item)}
				</li>
			{/each}
		</ul>
	</div>
{/if}
