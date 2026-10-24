<script lang="ts">
	type Props = {
		/** OpenStreetMap embed URL (`osmEmbedUrl`). */
		src: string;
		/** Accessible name of the frame. */
		title: string;
	};

	let { src, title }: Props = $props();
</script>

<!-- OpenStreetMap's own embed: no key, lazy so the third party only loads near the viewport.
     Its tiles are light only, so dark mode inverts them (hue-rotate keeps water blue). -->
<div class="aspect-[4/3] w-full overflow-hidden rounded-card bg-fill ring-1 ring-line dark:ring-0">
	<iframe
		{src}
		{title}
		loading="lazy"
		referrerpolicy="no-referrer"
		class="h-full w-full border-0 dark:[filter:invert(0.9)_hue-rotate(180deg)_saturate(0.8)]"
	></iframe>
</div>
