<script lang="ts">
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import Select, { type SelectOption } from '#lib/components/ui/Select.svelte';
	import { m } from '#lib/messages.ts';
	import type { PlacardAction, PlacardSide, PlacardSubPlayer, PlacardTeam } from '#lib/placard.ts';

	type Props = {
		home: PlacardTeam;
		away: PlacardTeam;
		squads: Record<PlacardSide, PlacardSubPlayer[]>;
		/** Seconds left of an overlay on the screen (an ad, a substitution), or 0. */
		busySeconds: number;
		/** Sends the action; resolves true when the screen took it. */
		onsend: (action: PlacardAction) => Promise<boolean>;
	};

	let { home, away, squads, busySeconds, onsend }: Props = $props();

	// The team first, then who leaves and who comes on, from that team's squad.
	let side = $state<PlacardSide>('home');
	let outId = $state('');
	let inId = $state('');
	let sending = $state(false);

	const options = (exclude: string): SelectOption[] =>
		squads[side]
			.filter((player) => String(player.id) !== exclude)
			.map((player) => ({ value: String(player.id), label: player.name, image: player.picture }));

	const outOptions = $derived(options(inId));
	const inOptions = $derived(options(outId));
	const ready = $derived(outId !== '' && inId !== '' && outId !== inId);

	function pickSide(next: PlacardSide) {
		side = next;
		outId = '';
		inId = '';
	}

	async function send() {
		if (!ready || sending) return;
		sending = true;
		const sent = await onsend({
			type: 'show_substitution',
			side,
			outPlayerId: Number(outId),
			inPlayerId: Number(inId)
		});
		sending = false;
		if (sent) {
			outId = '';
			inId = '';
		}
	}
</script>

<section
	class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0"
	aria-labelledby="sub-title"
>
	<h2 id="sub-title" class="text-headline text-ink">{m.placard_sub_title()}</h2>
	<div class="mt-3 space-y-3">
		<SegmentedControl
			label={m.placard_sub_team()}
			options={[
				{ value: 'home', label: home.name },
				{ value: 'away', label: away.name }
			]}
			value={side}
			onchange={pickSide}
		/>
		{#if squads[side].length < 2}
			<p class="text-footnote text-ink-tertiary">{m.placard_sub_no_squad()}</p>
		{:else}
			{#key side}
				<Select
					label={m.placard_sub_out_label()}
					placeholder={m.placard_sub_pick()}
					options={outOptions}
					searchable
					bind:value={outId}
				/>
				<Select
					label={m.placard_sub_in_label()}
					placeholder={m.placard_sub_pick()}
					options={inOptions}
					searchable
					bind:value={inId}
				/>
			{/key}
			<Button
				icon={ArrowsLeftRightIcon}
				size="lg"
				full
				disabled={!ready || busySeconds > 0}
				loading={sending}
				onclick={send}
			>
				<span class="tabular-nums">
					{busySeconds > 0 ? m.placard_sub_wait({ seconds: busySeconds }) : m.placard_sub_show()}
				</span>
			</Button>
		{/if}
	</div>
</section>
