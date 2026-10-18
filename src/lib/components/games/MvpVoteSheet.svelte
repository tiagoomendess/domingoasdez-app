<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import Select, { type SelectOption } from '#lib/components/ui/Select.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { m } from '#lib/messages.ts';

	type Player = { id: number; name: string; picture: string };
	type Side = 'home' | 'away';

	type Props = {
		open: boolean;
		gameId: number;
		homeName: string;
		awayName: string;
		homeEmblem?: string | null;
		awayEmblem?: string | null;
		homePlayers: Player[];
		awayPlayers: Player[];
		formAction?: string;
	};

	let {
		open = $bindable(false),
		gameId,
		homeName,
		awayName,
		homeEmblem = null,
		awayEmblem = null,
		homePlayers,
		awayPlayers,
		formAction = '?/mvp'
	}: Props = $props();

	/** Step one picks the team, step two the player from that team's squad. */
	let team = $state<Side | null>(null);
	let selected = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const sides = $derived([
		{ key: 'home' as const, name: homeName, emblem: homeEmblem, players: homePlayers },
		{ key: 'away' as const, name: awayName, emblem: awayEmblem, players: awayPlayers }
	]);
	const playable = $derived(sides.filter((side) => side.players.length > 0));
	// With only one squad on file there is nothing to choose: go straight to its players.
	const chosen = $derived(
		team ? sides.find((side) => side.key === team) : playable.length === 1 ? playable[0] : null
	);

	const options = $derived<SelectOption[]>(
		(chosen?.players ?? []).map((player) => ({
			value: String(player.id),
			label: player.name,
			image: player.picture
		}))
	);

	function pickTeam(side: Side) {
		if (side !== team) selected = '';
		team = side;
	}

	function resetForm() {
		team = null;
		selected = '';
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
			default:
				return m.game_mvp_error_invalid();
		}
	}
</script>

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
				error =
					result.type === 'failure' ? errorMessage(result.data?.error) : m.game_mvp_error_invalid();
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="game" value={gameId} />
		<input type="hidden" name="player" value={selected} />

		{#if error}
			<p class="rounded-field bg-danger/10 px-4 py-3 text-subhead text-danger" role="alert">
				{error}
			</p>
		{/if}

		{#if !chosen}
			<fieldset class="space-y-3">
				<legend class="mb-3 px-1 text-subhead text-ink-secondary">{m.game_mvp_pick_team()}</legend>
				<div class="grid grid-cols-2 gap-3">
					{#each sides as side (side.key)}
						<button
							type="button"
							disabled={side.players.length === 0}
							class="flex pressable flex-col items-center gap-2.5 rounded-card bg-fill px-3 pt-5 pb-4 text-center hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40"
							onclick={() => pickTeam(side.key)}
						>
							<Emblem name={side.name} src={side.emblem} size={72} plate={false} decorative />
							<span class="line-clamp-2 text-headline text-ink">{side.name}</span>
							<span class="text-footnote text-ink-tertiary tabular-nums">
								{m.game_mvp_squad_count({ count: side.players.length })}
							</span>
						</button>
					{/each}
				</div>
			</fieldset>
		{:else}
			<div class="flex items-center gap-3 rounded-field bg-fill py-2 pr-1.5 pl-3">
				<Emblem name={chosen.name} src={chosen.emblem} size={32} plate={false} decorative />
				<span class="min-w-0 flex-1 truncate text-headline text-ink">{chosen.name}</span>
				{#if playable.length > 1}
					<Button
						type="button"
						variant="plain"
						onclick={() => {
							team = null;
							selected = '';
						}}
					>
						{m.game_mvp_change_team()}
					</Button>
				{/if}
			</div>

			<Select
				label={m.game_mvp_player_label()}
				placeholder={m.game_mvp_player_placeholder()}
				{options}
				searchable
				bind:value={selected}
			/>
		{/if}

		<div class="flex flex-col gap-2 pt-2">
			<Button type="submit" full disabled={!selected} loading={submitting}>
				{m.game_mvp_submit()}
			</Button>
			<Button type="button" variant="plain" full onclick={() => setOpen(false)}>
				{m.game_mvp_cancel()}
			</Button>
		</div>
	</form>
</Sheet>
