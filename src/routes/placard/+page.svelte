<script lang="ts">
	import { onMount } from 'svelte';
	import ArrowsOutIcon from 'phosphor-svelte/lib/ArrowsOutIcon';
	import { placardScenes } from '#lib/components/placard/scenes.ts';
	import { m } from '#lib/messages.ts';
	import { PlacardPoll } from '#lib/placard-poll.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	const poll = new PlacardPoll({
		url: '/api/placard/estado',
		intervalMs: 1_000,
		initial: data.initial
	});

	let localNow = $state(Date.now());
	let controlsVisible = $state(true);
	let fullscreen = $state(false);

	const screen = $derived(poll.state);
	const scene = $derived(screen ? placardScenes[screen.scene] : null);
	const sceneProps = $derived(
		screen && scene ? scene.props(screen, poll.serverNow(localNow)) : null
	);
	const offline = $derived(poll.failures >= 3);

	onMount(() => {
		const stop = poll.start();

		// The clock is drawn every frame from server time; the text only changes once a second.
		let frame = requestAnimationFrame(function tick() {
			localNow = Date.now();
			frame = requestAnimationFrame(tick);
		});

		// Keep the TV awake. The lock is dropped when the tab is hidden, so ask again on return.
		let lock: WakeLockSentinel | null = null;
		const keepAwake = async () => {
			if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
			try {
				lock = await navigator.wakeLock.request('screen');
			} catch {
				// Refused (battery saver, no user gesture yet on some browsers): the screen may dim.
			}
		};
		void keepAwake();
		document.addEventListener('visibilitychange', keepAwake);

		// The fullscreen button and the cursor hide after 3 s without moving the mouse.
		let idle: ReturnType<typeof setTimeout>;
		const wake = () => {
			controlsVisible = true;
			clearTimeout(idle);
			idle = setTimeout(() => (controlsVisible = false), 3_000);
		};
		wake();
		window.addEventListener('pointermove', wake);
		const onFullscreen = () => (fullscreen = document.fullscreenElement !== null);
		document.addEventListener('fullscreenchange', onFullscreen);

		return () => {
			stop();
			cancelAnimationFrame(frame);
			document.removeEventListener('visibilitychange', keepAwake);
			void lock?.release();
			clearTimeout(idle);
			window.removeEventListener('pointermove', wake);
			document.removeEventListener('fullscreenchange', onFullscreen);
		};
	});

	function enterFullscreen() {
		void document.documentElement.requestFullscreen?.().catch(() => {});
		// A user gesture: a good moment to (re)take the wake lock too.
		void navigator.wakeLock?.request('screen').catch(() => {});
	}
</script>

<svelte:head>
	<title>{m.placard_tv_title()} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class={['screen', !controlsVisible && 'idle']}
	style:--placard-bg={screen?.theme.background ?? '#08090b'}
	style:--placard-fg={screen?.theme.foreground ?? '#f3f5f8'}
	style:--placard-muted={screen?.theme.muted ?? '#a8b0bd'}
	style:--placard-accent={screen?.theme.accent ?? '#5cb6ea'}
>
	{#if scene && sceneProps}
		<scene.component {...sceneProps} />
	{:else}
		<p class="loading" role="status">{m.placard_tv_loading()}</p>
	{/if}

	{#if offline}
		<p class="offline" role="status">
			<span class="dot" aria-hidden="true"></span>{m.placard_tv_offline()}
		</p>
	{/if}

	{#if !fullscreen && controlsVisible}
		<button
			type="button"
			class="fullscreen"
			onclick={enterFullscreen}
			aria-label={m.placard_tv_fullscreen()}
		>
			<ArrowsOutIcon size={24} weight="bold" />
		</button>
	{/if}
</main>

<style>
	.screen {
		position: fixed;
		inset: 0;
		container-type: size;
		overflow: hidden;
		background: var(--placard-bg);
		color: var(--placard-fg);
		font-family: var(--font-sans);
		user-select: none;
	}

	.screen.idle {
		cursor: none;
	}

	.loading {
		display: grid;
		height: 100%;
		place-items: center;
		font-size: 3cqmin;
		color: var(--placard-muted);
	}

	.offline {
		position: absolute;
		bottom: 2cqmin;
		left: 2cqmin;
		display: flex;
		align-items: center;
		gap: 0.6em;
		font-size: max(12px, 1.8cqmin);
		color: var(--placard-muted);
	}

	.dot {
		width: 0.7em;
		height: 0.7em;
		border-radius: 999px;
		background: var(--live, #ff5c57);
	}

	.fullscreen {
		position: absolute;
		top: 16px;
		right: 16px;
		display: grid;
		width: 44px;
		height: 44px;
		place-items: center;
		border-radius: 999px;
		background: color-mix(in srgb, var(--placard-fg) 12%, transparent);
		color: var(--placard-fg);
	}
</style>
