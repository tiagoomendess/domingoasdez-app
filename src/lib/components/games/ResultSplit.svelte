<script lang="ts">
	type Props = {
		homeWins: number;
		draws: number;
		awayWins: number;
		homeWinPercent: number;
		drawPercent: number;
		awayWinPercent: number;
		homeLabel: string;
		drawLabel: string;
		awayLabel: string;
		/** Names the bar for screen readers. */
		label: string;
	};

	let {
		homeWins,
		draws,
		awayWins,
		homeWinPercent,
		drawPercent,
		awayWinPercent,
		homeLabel,
		drawLabel,
		awayLabel,
		label
	}: Props = $props();

	function pct(value: number): string {
		return value.toLocaleString(undefined, {
			maximumFractionDigits: 2,
			minimumFractionDigits: 0
		});
	}
</script>

<div class="flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={label}>
	{#if homeWinPercent > 0}
		<span class="bg-danger" style:width="{homeWinPercent}%"></span>
	{/if}
	{#if drawPercent > 0}
		<span class="bg-fill-strong" style:width="{drawPercent}%"></span>
	{/if}
	{#if awayWinPercent > 0}
		<span class="bg-accent" style:width="{awayWinPercent}%"></span>
	{/if}
</div>

<ul class="mt-3 space-y-1.5 text-footnote">
	<li class="flex items-center justify-between gap-3">
		<span class="flex items-center gap-2 text-ink-secondary">
			<span aria-hidden="true" class="size-2.5 rounded-full bg-danger"></span>
			{homeLabel}
		</span>
		<span class="text-ink tabular-nums"
			>{homeWins} <span class="text-ink-tertiary">({pct(homeWinPercent)}%)</span></span
		>
	</li>
	<li class="flex items-center justify-between gap-3">
		<span class="flex items-center gap-2 text-ink-secondary">
			<span aria-hidden="true" class="size-2.5 rounded-full bg-fill-strong"></span>
			{drawLabel}
		</span>
		<span class="text-ink tabular-nums"
			>{draws} <span class="text-ink-tertiary">({pct(drawPercent)}%)</span></span
		>
	</li>
	<li class="flex items-center justify-between gap-3">
		<span class="flex items-center gap-2 text-ink-secondary">
			<span aria-hidden="true" class="size-2.5 rounded-full bg-accent"></span>
			{awayLabel}
		</span>
		<span class="text-ink tabular-nums"
			>{awayWins} <span class="text-ink-tertiary">({pct(awayWinPercent)}%)</span></span
		>
	</li>
</ul>
