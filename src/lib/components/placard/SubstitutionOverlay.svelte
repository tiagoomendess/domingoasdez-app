<script lang="ts">
	import { m } from '#lib/messages.ts';
	import { materialize } from '#lib/motion.ts';
	import type { PlacardOverlay, PlacardSubPlayer } from '#lib/placard.ts';
	import OverlayProgress from './OverlayProgress.svelte';

	type Props = {
		overlay: Extract<PlacardOverlay, { type: 'substitution' }>;
		/** Server time now (ms), ticking. */
		now: number;
	};

	let { overlay, now }: Props = $props();

	const initials = (name: string) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('');
</script>

{#snippet player(kind: 'out' | 'in', who: PlacardSubPlayer)}
	<div class={['player', kind]}>
		<span class="badge">
			<span aria-hidden="true">{kind === 'out' ? '↓' : '↑'}</span>
			{kind === 'out' ? m.placard_sub_out() : m.placard_sub_in()}
		</span>
		{#if who.picture}
			<img class="photo" src={who.picture} alt="" />
		{:else}
			<span class="photo initials" aria-hidden="true">{initials(who.name)}</span>
		{/if}
		<p class="name">{who.name}</p>
	</div>
{/snippet}

<!--
	A substitution, over the whole screen for 10 s: the team, then who leaves and who comes on.
	Photos only for adults; others get their initials.
-->
<div
	class="sub"
	role="status"
	aria-label={m.placard_sub_label({
		team: overlay.team.name,
		out: overlay.out.name,
		in: overlay.in.name
	})}
	in:materialize={{ duration: 380 }}
>
	<header>
		<img class="emblem" src={overlay.team.emblem} alt="" />
		<div>
			<p class="title">{m.placard_sub_title()}</p>
			<p class="team">{overlay.team.name}</p>
		</div>
	</header>
	<div class="players">
		{@render player('out', overlay.out)}
		{@render player('in', overlay.in)}
	</div>
	<OverlayProgress startedAt={overlay.startedAt} endsAt={overlay.endsAt} {now} />
</div>

<style>
	.sub {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6cqmin;
		padding: 5cqmin;
		background: var(--placard-bg);
		background-image: inherit;
		background-position: center;
		background-size: cover;
	}

	header {
		display: flex;
		align-items: center;
		gap: 3cqmin;
	}

	.emblem {
		width: 14cqmin;
		height: 14cqmin;
		object-fit: contain;
	}

	.title {
		font-size: 4cqmin;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--placard-accent);
	}

	.team {
		font-size: 6cqmin;
		font-weight: 700;
		line-height: 1.1;
	}

	.players {
		display: grid;
		width: 100%;
		max-width: 160cqmin;
		grid-template-columns: 1fr 1fr;
		gap: 5cqw;
	}

	.player {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: center;
		gap: 2.5cqmin;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		border-radius: 999px;
		padding: 0.25em 0.9em;
		font-size: 3.4cqmin;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: white;
		text-shadow: none;
	}

	.out .badge {
		background: #d42c2a;
	}

	.in .badge {
		background: #2f7a45;
	}

	.photo {
		width: 26cqmin;
		height: 26cqmin;
		border-radius: 999px;
		object-fit: cover;
		background: color-mix(in srgb, var(--placard-fg) 14%, transparent);
	}

	.initials {
		display: grid;
		place-items: center;
		font-size: 9cqmin;
		font-weight: 700;
	}

	.out .photo {
		opacity: 0.75;
	}

	.name {
		max-width: 100%;
		overflow: hidden;
		font-size: 6cqmin;
		font-weight: 700;
		line-height: 1.15;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@container (aspect-ratio < 1) {
		.players {
			grid-template-columns: 1fr;
			gap: 6cqmin;
		}

		.photo {
			width: 30cqw;
			height: 30cqw;
		}
	}
</style>
