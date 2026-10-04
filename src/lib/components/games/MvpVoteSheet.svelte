<script lang="ts">
	import { enhance } from '$app/forms';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { m } from '#lib/messages.ts';

	type Player = { id: number; name: string; picture: string };

	type Props = {
		open: boolean;
		gameId: number;
		homeName: string;
		awayName: string;
		homePlayers: Player[];
		awayPlayers: Player[];
		formAction?: string;
	};

	let {
		open = $bindable(false),
		gameId,
		homeName,
		awayName,
		homePlayers,
		awayPlayers,
		formAction = '?/mvp'
	}: Props = $props();

	let selectedId = $state<number | null>(null);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	function resetForm() {
		selectedId = null;
		error = null;
		submitting = false;
	}

	function setOpen(value: boolean) {
		open = value;
		if (!value) resetForm();
	}

	function errorMessage(code: unknown): string {
		switch (code) {
			case 'closed':
				return m.game_mvp_error_closed();
			case 'already_voted':
				return m.game_mvp_error_already();
			case 'invalid_player':
			case 'invalid':
				return m.game_mvp_error_invalid();
			default:
				return m.game_mvp_error_invalid();
		}
	}
</script>

{#snippet playerList(label: string, players: Player[])}
	{#if players.length > 0}
		<div>
			<h3 class="mb-1 px-1 text-footnote font-semibold text-ink-secondary">{label}</h3>
			<div role="radiogroup" aria-label={label} class="-mx-5">
				{#each players as player (player.id)}
					{@const selected = selectedId === player.id}
					<button
						type="button"
						role="radio"
						aria-checked={selected}
						class={[
							'flex min-h-13 w-full items-center gap-3 px-5 text-left transition-colors',
							'hover:bg-fill active:bg-fill-strong'
						]}
						onclick={() => (selectedId = player.id)}
					>
						<Avatar name={player.name} src={player.picture} size={40} />
						<span
							class={['min-w-0 flex-1 truncate text-body', selected && 'font-semibold text-ink']}
						>
							{player.name}
						</span>
						{#if selected}
							<CheckIcon size={20} weight="bold" class="shrink-0 text-accent-text" />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<Sheet bind:open={() => open, (value) => setOpen(value)} title={m.game_mvp_pick_title()}>
	<form
		method="POST"
		action={formAction}
		class="space-y-4"
		use:enhance={() => {
			submitting = true;
			error = null;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					setOpen(false);
					await update();
					return;
				}
				if (result.type === 'failure') {
					error = errorMessage(result.data?.error);
				} else {
					error = m.game_mvp_error_invalid();
				}
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="game" value={gameId} />
		<input type="hidden" name="player" value={selectedId ?? ''} />

		{#if error}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{error}
			</p>
		{/if}

		{@render playerList(homeName, homePlayers)}
		{@render playerList(awayName, awayPlayers)}

		<div class="flex flex-col gap-2 pt-2">
			<Button type="submit" full disabled={selectedId == null} loading={submitting}>
				{m.game_mvp_submit()}
			</Button>
			<Button type="button" variant="plain" full onclick={() => setOpen(false)}>
				{m.game_mvp_cancel()}
			</Button>
		</div>
	</form>
</Sheet>
