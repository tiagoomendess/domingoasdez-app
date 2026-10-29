<script lang="ts">
	import { m } from '#lib/messages.ts';
	import { rollIn, rollOut } from '#lib/motion.ts';
	import { elapsedMs, formatClock, type PlacardPublicState } from '#lib/placard.ts';

	type Props = {
		match: NonNullable<PlacardPublicState['match']>;
		showNames: boolean;
		/** Server time now (ms), ticking. */
		now: number;
	};

	let { match, showNames, now }: Props = $props();

	const teams = $derived([
		{ side: 'home', team: match.home },
		{ side: 'away', team: match.away }
	] as const);

	const started = $derived(match.clock.runningSince !== null || match.clock.elapsedMs > 0);
	const clock = $derived(formatClock(elapsedMs(match.clock, now)));
	const periodLabel = $derived(match.clock.period === 'half_time' ? m.placard_half_time() : null);
</script>

<div class="match">
	{#each teams as { side, team } (side)}
		<!-- A missing emblem keeps its space, but no broken-image icon on the stadium TV. -->
		<img
			class="emblem"
			style:grid-area="{side}Emblem"
			src={team.emblem}
			alt={showNames ? '' : team.name}
			onerror={(event) => ((event.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>
	{/each}

	<div class="center">
		<!-- The clock appears at kick-off, like the old screen (no 00:00 before the game). -->
		<p class="clock tabular-nums" aria-hidden={!started}>
			{#if started}{clock}{:else}&nbsp;{/if}
		</p>
		<p class="score tabular-nums" aria-label={`${match.homeScore}–${match.awayScore}`}>
			<span class="digit">
				{#key match.homeScore}
					<span in:rollIn={{ tint: false }} out:rollOut>{match.homeScore}</span>
				{/key}
			</span>
			<span class="dash" aria-hidden="true">–</span>
			<span class="digit">
				{#key match.awayScore}
					<span in:rollIn={{ tint: false }} out:rollOut>{match.awayScore}</span>
				{/key}
			</span>
		</p>
		<p class="period">
			{#if periodLabel}{periodLabel}{:else}&nbsp;{/if}
		</p>
	</div>

	<!--
		Names sit on their own row under the score, each one filling its half of the width and
		only truncating when it reaches the centre, so long club names no longer get cut to the
		emblem's width.
	-->
	{#if showNames}
		<div class="names">
			{#each teams as { side, team } (side)}
				<p class={['name', side]}>{team.name}</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	.match {
		display: grid;
		height: 100%;
		grid-template-columns: 1fr auto 1fr;
		grid-template-areas:
			'homeEmblem center awayEmblem'
			'names      names  names';
		align-content: center;
		align-items: center;
		column-gap: 3cqw;
		row-gap: 1.5cqmin;
		padding: 4cqmin;
	}

	/* Emblems are centred vertically on the score, not floated above the name. */
	.emblem {
		width: min(22cqw, 40cqh);
		aspect-ratio: 1;
		justify-self: center;
		object-fit: contain;
	}

	.center {
		grid-area: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}

	.clock {
		font-size: min(9.5cqw, 16cqh);
		font-weight: 500;
		color: var(--placard-muted);
	}

	.score {
		display: flex;
		align-items: center;
		margin-block: 1.5cqmin;
		font-size: min(21cqw, 34cqh);
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.digit {
		display: grid;
		min-width: 1.2ch;
		justify-items: center;
		overflow: hidden;
	}

	.digit > :global(span) {
		grid-area: 1 / 1;
	}

	.dash {
		padding-inline: 0.15em;
		color: var(--placard-muted);
	}

	.period {
		font-size: min(3.6cqw, 6cqh);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--placard-accent);
	}

	/* Two halves meeting at the centre: each name grows outward and ellipsises near the dash. */
	.names {
		grid-area: names;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: baseline;
		width: 100%;
	}

	.name {
		overflow: hidden;
		font-size: 4.4cqmin;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.name.home {
		padding-right: 3cqw;
		text-align: left;
	}

	/* direction:rtl puts the ellipsis on the left, so the away name also truncates
	   toward the centre (its inner edge) instead of at the outer edge. */
	.name.away {
		padding-left: 3cqw;
		direction: rtl;
		text-align: right;
	}

	@container (aspect-ratio < 1) {
		.match {
			grid-template-columns: 1fr 1fr;
			grid-template-areas:
				'homeEmblem awayEmblem'
				'center     center'
				'names      names';
			row-gap: 4cqmin;
		}

		.emblem {
			width: min(34cqw, 24cqh);
		}

		.clock {
			font-size: 13cqw;
		}

		.score {
			font-size: 33cqw;
		}

		.period {
			font-size: 6cqw;
		}

		.name {
			font-size: 6cqw;
		}
	}
</style>
