<script lang="ts">
	type Props = {
		name: string;
		src?: string | null;
		size?: 24 | 32 | 40 | 72;
		shape?: 'circle' | 'rounded';
		/**
		 * White plate behind the mark. Competition logos keep it (many are JPEGs).
		 * Club emblems are PNGs and sit directly on the page.
		 */
		plate?: boolean;
		/** The name is already printed next to the emblem, so screen readers can skip it */
		decorative?: boolean;
	};

	let {
		name,
		src,
		size = 32,
		shape = 'circle',
		plate = true,
		decorative = false
	}: Props = $props();

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

<span
	class={[
		'inline-grid shrink-0 place-items-center',
		plate && 'overflow-hidden bg-white ring-1 ring-black/8 dark:ring-white/10',
		plate && (shape === 'circle' ? 'rounded-full' : 'rounded-badge')
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
			class={['size-full object-contain', plate && 'p-[8%]']}
			onerror={() => (failedSrc = src ?? null)}
		/>
	{:else if decorative}
		<span
			aria-hidden="true"
			class={['font-semibold', plate ? 'text-brand-800' : 'text-ink']}
			style:font-size="{size * 0.36}px"
		>
			{initials}
		</span>
	{:else}
		<span
			role="img"
			aria-label={name}
			class={['font-semibold', plate ? 'text-brand-800' : 'text-ink']}
			style:font-size="{size * 0.36}px"
		>
			{initials}
		</span>
	{/if}
</span>
