<script lang="ts">
	import { m } from '#lib/messages.ts';
	import { materialize } from '#lib/motion.ts';
	import { messageLength, type PlacardOverlay } from '#lib/placard.ts';
	import OverlayProgress from './OverlayProgress.svelte';

	type Props = {
		overlay: Extract<PlacardOverlay, { type: 'message' }>;
		/** Server time now (ms), ticking. */
		now: number;
	};

	let { overlay, now }: Props = $props();

	// Short messages as large as a score; the longest (120 characters) still over a few lines.
	const length = $derived(messageLength(overlay.text));
	const size = $derived(length <= 30 ? 'large' : length <= 70 ? 'medium' : 'small');
</script>

<!-- The controller's own text over the whole screen for 15 s, centred, as plain text. -->
<div class="message" role="status" in:materialize={{ duration: 380 }}>
	<p class="label">{m.placard_message_label()}</p>
	<p class={['text', size]}>{overlay.text}</p>
	<OverlayProgress startedAt={overlay.startedAt} endsAt={overlay.endsAt} {now} />
</div>

<style>
	.message {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4cqmin;
		padding: 6cqmin 8cqw;
		background: var(--placard-bg);
		background-image: inherit;
		background-position: center;
		background-size: cover;
		text-align: center;
	}

	.label {
		font-size: 3.6cqmin;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--placard-accent);
	}

	.text {
		max-width: 100%;
		font-weight: 700;
		line-height: 1.15;
		overflow-wrap: anywhere;
		text-wrap: balance;
	}

	.large {
		font-size: min(10cqw, 16cqh);
	}

	.medium {
		font-size: min(7cqw, 11cqh);
	}

	.small {
		font-size: min(5cqw, 8cqh);
	}

	/* A portrait screen has height to spare: wrap into more lines, larger. */
	@container (aspect-ratio < 1) {
		.large {
			font-size: 14cqw;
		}

		.medium {
			font-size: 10.5cqw;
		}

		.small {
			font-size: 8cqw;
		}
	}
</style>
