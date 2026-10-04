<script lang="ts">
	import { formatRelative } from '#lib/format.ts';

	type Props = {
		href: string;
		title: string;
		date: string;
		excerpt?: string;
		image?: string | null;
		meta?: string;
	};

	let { href, title, date, excerpt, image, meta }: Props = $props();
</script>

<article
	class="relative rounded-card bg-surface p-2.5 ring-1 ring-line outline-accent transition-transform duration-(--dur-press) ease-snappy has-[a:active]:scale-98 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 motion-reduce:has-[a:active]:scale-100 dark:ring-0"
>
	{#if image}
		<img
			src={image}
			alt=""
			loading="lazy"
			decoding="async"
			class="aspect-video w-full rounded-inner bg-fill object-cover"
		/>
	{/if}
	<div class="px-1.5 pt-3 pb-1.5">
		<h3 class="line-clamp-3 text-title-3 text-ink">
			<a {href} class="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
				{title}
			</a>
		</h3>
		{#if excerpt}
			<p class="mt-1.5 line-clamp-2 text-callout text-ink-secondary">{excerpt}</p>
		{/if}
		<p class="mt-2 text-footnote text-ink-tertiary">
			<time datetime={date}>{formatRelative(date)}</time>
			{#if meta}
				<span aria-hidden="true" class="mx-1">·</span>{meta}
			{/if}
		</p>
	</div>
</article>
