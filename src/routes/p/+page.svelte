<script lang="ts">
	import FilesIcon from 'phosphor-svelte/lib/FilesIcon';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.nav_pages()} · {m.feed_brand()}</title>
	<meta name="description" content={m.pages_meta_description()} />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-large-title text-ink">{m.nav_pages()}</h1>
</header>

{#if data.pages.length === 0}
	<EmptyState icon={FilesIcon} title={m.pages_empty_title()} description={m.pages_empty_text()} />
{:else}
	{#snippet pageRow(page: (typeof data.pages)[number])}
		<ListRow title={page.name} href={page.href} />
	{/snippet}

	<div class="md:hidden">
		<ListGroup>
			{#each data.pages as page (page.id)}
				{@render pageRow(page)}
			{/each}
		</ListGroup>
	</div>

	<div class="hidden gap-3 md:grid md:grid-cols-2">
		{#each data.pages as page (page.id)}
			<ListGroup>
				{@render pageRow(page)}
			</ListGroup>
		{/each}
	</div>
{/if}

<div class="mt-6">
	<ListGroup title={m.pages_legal_group()} headingLevel={2}>
		<ListRow title={m.pages_privacy()} href="/politica-de-privacidade" />
		<ListRow title={m.pages_terms()} href="/termos-e-condicoes" />
		<ListRow title={m.pages_rgpd()} href="/rgpd" />
	</ListGroup>
</div>
