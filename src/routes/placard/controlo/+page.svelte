<script lang="ts">
	import MonitorIcon from 'phosphor-svelte/lib/MonitorIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import { m } from '#lib/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.placard_list_title()} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-title-1 text-ink">{m.placard_list_title()}</h1>
	<p class="mt-2 text-subhead text-ink-secondary">{m.placard_list_intro()}</p>
</header>

<div class="space-y-6">
	{#if data.screens.length === 0}
		<EmptyState
			icon={MonitorIcon}
			title={m.placard_list_empty()}
			description={m.placard_list_empty_hint()}
		/>
	{:else}
		<ListGroup>
			{#each data.screens as screen (screen.id)}
				<ListRow
					title={screen.home && screen.away
						? `${screen.home.name} – ${screen.away.name}`
						: m.placard_screen_name({ id: screen.id })}
					subtitle={m.placard_list_score({ home: screen.homeScore, away: screen.awayScore })}
					href={`/placard/controlo/${screen.id}`}
				>
					{#snippet leading()}
						{#if screen.home}
							<Emblem
								name={screen.home.name}
								src={screen.home.emblem}
								size={32}
								plate={false}
								decorative
							/>
						{:else}
							<MonitorIcon size={24} class="text-ink-tertiary" />
						{/if}
					{/snippet}
				</ListRow>
			{/each}
		</ListGroup>
	{/if}

	<Button href="/placard/ligar" variant="tinted" size="lg" full>{m.placard_list_pair()}</Button>
</div>
