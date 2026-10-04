<script lang="ts">
	type Props = {
		name: string;
		src?: string | null;
		size?: 24 | 32 | 40 | 72;
		shape?: 'circle' | 'rounded';
		/** The name is already printed next to the emblem, so screen readers can skip it */
		decorative?: boolean;
	};

	let { name, src, size = 32, shape = 'circle', decorative = false }: Props = $props();

	let failedSrc = $state<string | null>(null);
	const showImage = $derived(!!src && src !== failedSrc);

	const initials = $derived(
		name
			.split(/\s+/)
			.filter((word) => word.length > 2)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('')
	);
</script>

<!-- The plate stays white in both themes: many legacy logos are JPEGs with white backgrounds -->
<span
	class={[
		'inline-grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-black/8 dark:ring-white/10',
		shape === 'circle' ? 'rounded-full' : 'rounded-badge'
	]}
	style:width="{size}px"
	style:height="{size}px"
>
	{#if showImage}
		<img
			{src}
			alt={decorative ? '' : name}
			width={size}
			height={size}
			loading="lazy"
			decoding="async"
			class="size-full object-contain p-[8%]"
			onerror={() => (failedSrc = src ?? null)}
		/>
	{:else if decorative}
		<span aria-hidden="true" class="font-semibold text-brand-800" style:font-size="{size * 0.36}px">
			{initials}
		</span>
	{:else}
		<span
			role="img"
			aria-label={name}
			class="font-semibold text-brand-800"
			style:font-size="{size * 0.36}px"
		>
			{initials}
		</span>
	{/if}
</span>
