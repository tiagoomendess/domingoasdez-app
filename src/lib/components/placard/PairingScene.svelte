<script lang="ts">
	import { m } from '#lib/messages.ts';
	import { spacedCode, type PlacardPublicState } from '#lib/placard.ts';

	type Props = { pairing: NonNullable<PlacardPublicState['pairing']> };

	let { pairing }: Props = $props();

	// "app.domingoasdez.com/placard/ligar": the page to open by hand, without the code.
	const manualUrl = $derived(pairing.url.replace(/^https?:\/\//, '').replace(/\/[^/]+$/, ''));
</script>

<div class="pairing">
	<!-- The SVG is drawn by the server (uqr) from our own URL, never from user input. -->
	<div class="qr" role="img" aria-label={m.placard_tv_qr_label()}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html pairing.qrSvg}
	</div>
	<div class="text">
		<p class="title">{m.placard_tv_pairing_title()}</p>
		<p class="code tabular-nums" aria-label={pairing.code.split('').join(' ')}>
			{spacedCode(pairing.code)}
		</p>
		<p class="hint">{m.placard_tv_pairing_hint({ url: manualUrl })}</p>
	</div>
</div>

<style>
	.pairing {
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
		gap: 6cqmin;
		padding: 6cqmin;
	}

	.qr {
		width: min(42cqw, 70cqh);
		flex-shrink: 0;
		overflow: hidden;
		border-radius: 3cqmin;
		background: white;
		padding: 1.5cqmin;
	}

	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	.text {
		max-width: 46cqw;
	}

	.title {
		font-size: 4.6cqmin;
		font-weight: 600;
		line-height: 1.2;
	}

	.code {
		margin-top: 3cqmin;
		font-size: 11cqmin;
		font-weight: 700;
		letter-spacing: 0.06em;
		line-height: 1;
		white-space: nowrap;
		color: var(--placard-accent);
	}

	.hint {
		margin-top: 3cqmin;
		font-size: 3cqmin;
		color: var(--placard-muted);
	}

	@container (aspect-ratio < 1) {
		.pairing {
			flex-direction: column;
			text-align: center;
		}

		.qr {
			width: min(70cqw, 45cqh);
		}

		.text {
			max-width: none;
		}
	}
</style>
