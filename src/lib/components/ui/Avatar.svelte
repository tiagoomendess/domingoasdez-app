<script lang="ts">
	type Props = {
		name: string;
		src?: string | null;
		size?: 24 | 28 | 40 | 72 | 128;
	};

	let { name, src, size = 40 }: Props = $props();

	let failedSrc = $state<string | null>(null);
	const showImage = $derived(!!src && src !== failedSrc);

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('')
	);
</script>

<span
	class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-tint"
	style:width="{size}px"
	style:height="{size}px"
>
	{#if showImage}
		<img
			{src}
			alt={name}
			width={size}
			height={size}
			class="size-full object-cover"
			onerror={() => (failedSrc = src ?? null)}
		/>
	{:else}
		<span
			role="img"
			aria-label={name}
			class="font-semibold text-accent-text"
			style:font-size="{size * 0.38}px"
		>
			{initials}
		</span>
	{/if}
</span>
