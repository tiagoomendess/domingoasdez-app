<script lang="ts">
	import MonitorIcon from 'phosphor-svelte/lib/MonitorIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatKickoff } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { spacedCode } from '#lib/placard.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	function choose(event: MouseEvent, gameId: number) {
		if (submitting) return;
		const target = (event.currentTarget as HTMLElement).closest('form');
		if (!target) return;
		(target.elements.namedItem('game') as HTMLInputElement).value = String(gameId);
		submitting = true;
		target.requestSubmit();
	}

	const statusLabel = (status: string) =>
		({
			live: m.placard_game_live(),
			warmup: m.placard_game_warmup(),
			finished: m.placard_game_finished(),
			postponed: m.placard_game_postponed()
		})[status] ?? null;
</script>

<svelte:head>
	<title>{m.placard_pair_title()} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="px-1 pb-3">
	<h1 class="text-title-1 text-ink">{m.placard_pair_title()}</h1>
	<p class="mt-2 text-subhead text-ink-secondary">
		{m.placard_pair_for_screen({ code: spacedCode(data.code) })}
	</p>
</header>

{#if !data.live}
	<EmptyState
		icon={WarningCircleIcon}
		title={m.placard_pair_code_expired()}
		description={m.placard_pair_code_expired_hint()}
	>
		{#snippet action()}
			<Button href="/placard/ligar" variant="tinted">{m.placard_pair_type_code()}</Button>
		{/snippet}
	</EmptyState>
{:else if data.games.length === 0}
	<EmptyState
		icon={MonitorIcon}
		title={m.placard_pair_no_games()}
		description={m.placard_pair_no_games_hint()}
	/>
{:else}
	<form method="POST" onsubmit={() => (submitting = true)}>
		<input type="hidden" name="game" value="" />
		{#if form?.error}
			<p class="mb-3 px-1 text-footnote text-danger" role="alert">{form.error}</p>
		{/if}
		<ListGroup title={m.placard_pair_choose_game()} footer={m.placard_pair_footer()}>
			{#each data.games as game (game.id)}
				<ListRow
					title={`${game.home.name} – ${game.away.name}`}
					subtitle={[formatKickoff(game.kickoff), statusLabel(game.status)]
						.filter(Boolean)
						.join(' · ')}
					onclick={(event) => choose(event, game.id)}
				>
					{#snippet leading()}
						<span class="flex -space-x-2">
							<Emblem
								name={game.home.name}
								src={game.home.emblem}
								size={32}
								plate={false}
								decorative
							/>
							<Emblem
								name={game.away.name}
								src={game.away.emblem}
								size={32}
								plate={false}
								decorative
							/>
						</span>
					{/snippet}
				</ListRow>
			{/each}
		</ListGroup>
	</form>
{/if}
