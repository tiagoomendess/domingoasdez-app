<script lang="ts">
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { formClasses, formLabel, formSentence } from '#lib/components/games/form.ts';
	import type { FormChip } from '#lib/components/types.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		open: boolean;
		/** The tapped chip; kept while the sheet closes so its content doesn't blank out. */
		chip: FormChip | null;
		/** The team the chip belongs to. */
		teamName: string;
	};

	let { open = $bindable(false), chip, teamName }: Props = $props();
</script>

<Sheet bind:open title={m.game_form_preview_title()}>
	{#if chip}
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<span
					aria-hidden="true"
					class={[
						'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-footnote font-semibold',
						formClasses(chip.result)
					]}
				>
					{formLabel(chip.result)}
				</span>
				<div class="min-w-0">
					<p class="truncate text-headline text-ink">{formSentence(chip.result, teamName)}</p>
					<p class="truncate text-footnote text-ink-secondary">
						{chip.competitionName} · {m.game_round_group({
							group: chip.groupName,
							round: chip.round
						})}
					</p>
				</div>
			</div>

			<div class="overflow-hidden rounded-field bg-surface-muted">
				<MatchRow match={chip.match} showDate interactive={false} />
			</div>

			<div class="flex flex-col gap-3">
				<Button
					href={chip.match.href}
					variant="filled"
					size="lg"
					full
					onclick={() => (open = false)}
				>
					{m.game_form_preview_open()}
				</Button>
				<Button variant="plain" size="lg" full onclick={() => (open = false)}>
					{m.game_form_preview_close()}
				</Button>
			</div>
		</div>
	{/if}
</Sheet>
