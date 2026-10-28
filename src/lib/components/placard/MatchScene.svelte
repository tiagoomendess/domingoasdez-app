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

	const started = $derived(match.clock.runningSince !== null || match.clock.elapsedMs > 0);
	const clock = $derived(formatClock(elapsedMs(match.clock, now)));
	const periodLabel = $derived(match.clock.period === 'half_time' ? m.placard_half_time() : null);
</script>

<div class="match">
	{#each [{ side: 'home', team: match.home }, { side: 'away', team: match.away }] as { side, team } (side)}
		<div class="team" style:grid-area={side}>
			<!-- A missing emblem keeps its space, but no broken-image icon on the stadium TV. -->
			<img
				src={team.emblem}
				alt={showNames ? '' : team.name}
				onerror={(event) => ((event.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
			/>
			{#if showNames}<p class="name">{team.name}</p>{/if}
		</div>
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
</div>

<style>
	.match {
		display: grid;
		height: 100%;
		grid-template-columns: 1fr auto 1fr;
		grid-template-areas: 'home center away';
		align-items: center;
		gap: 3cqw;
		padding: 5cqmin;
	}

	.team {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: center;
		gap: 3cqmin;
	}

	.team img {
		width: min(26cqw, 52cqh);
		aspect-ratio: 1;
		object-fit: contain;
	}

	.name {
		max-width: 100%;
		overflow: hidden;
		font-size: 4.2cqmin;
		font-weight: 600;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.center {
		grid-area: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}

	.clock {
		font-size: min(9cqw, 15cqh);
		font-weight: 500;
		color: var(--placard-muted);
	}

	.score {
		display: flex;
		align-items: center;
		margin-block: 2cqmin;
		font-size: min(19cqw, 36cqh);
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
		font-size: min(4cqw, 7cqh);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--placard-accent);
	}

	@container (aspect-ratio < 1) {
		.match {
			grid-template-columns: 1fr 1fr;
			grid-template-areas: 'home away' 'center center';
			align-content: center;
			gap: 6cqmin 4cqw;
		}

		.team img {
			width: min(36cqw, 26cqh);
		}

		.clock {
			font-size: 12cqw;
		}

		.score {
			font-size: 30cqw;
		}

		.period {
			font-size: 6cqw;
		}
	}
</style>
