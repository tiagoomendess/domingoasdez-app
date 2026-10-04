<script lang="ts">
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import type { Match } from '#lib/components/types.ts';

	type Props = {
		name: string;
		subtitle?: string;
		emblem?: string | null;
		href?: string;
		matches: Match[];
	};

	let { name, subtitle, emblem, href, matches }: Props = $props();
</script>

{#snippet header()}
	<Emblem src={emblem} {name} size={32} shape="rounded" decorative />
	<span class="min-w-0 flex-1">
		<h3 class="truncate text-headline text-ink">{name}</h3>
		{#if subtitle}
			<p class="truncate text-footnote text-ink-secondary">{subtitle}</p>
		{/if}
	</span>
{/snippet}

<section class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
	{#if href}
		<a
			{href}
			class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-fill active:bg-fill-strong"
		>
			{@render header()}
			<CaretRightIcon size={16} weight="bold" class="shrink-0 text-ink-tertiary" />
		</a>
	{:else}
		<div class="flex items-center gap-3 px-4 py-3">{@render header()}</div>
	{/if}
	<ul>
		{#each matches as match (match.id)}
			<li class="match">
				<MatchRow {match} />
			</li>
		{/each}
	</ul>
</section>

<style>
	.match {
		position: relative;
	}

	.match::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 4.75rem;
		height: 1px;
		background-color: var(--line);
	}
</style>
