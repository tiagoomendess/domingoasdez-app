<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ArrowCounterClockwiseIcon from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon';
	import CoffeeIcon from 'phosphor-svelte/lib/CoffeeIcon';
	import FastForwardIcon from 'phosphor-svelte/lib/FastForwardIcon';
	import MinusIcon from 'phosphor-svelte/lib/MinusIcon';
	import MonitorIcon from 'phosphor-svelte/lib/MonitorIcon';
	import PauseIcon from 'phosphor-svelte/lib/PauseIcon';
	import PlayIcon from 'phosphor-svelte/lib/PlayIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import RewindIcon from 'phosphor-svelte/lib/RewindIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import Toast from '#lib/components/ui/Toast.svelte';
	import { m } from '#lib/messages.ts';
	import { rollIn, rollOut } from '#lib/motion.ts';
	import {
		applyAction,
		elapsedMs,
		formatClock,
		MINUTE_MS,
		type PlacardAction,
		type PlacardPublicState,
		type PlacardSide,
		type ScorePushResult
	} from '#lib/placard.ts';
	import { PlacardPoll } from '#lib/placard-poll.svelte.ts';
	import { activeOverlay } from '#lib/components/placard/overlays.ts';
	import MegaphoneIcon from 'phosphor-svelte/lib/MegaphoneIcon';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	const poll = new PlacardPoll({
		url: `/api/placard/${data.initial.id}`,
		intervalMs: 2_000,
		initial: data.initial,
		pauseWhenHidden: true
	});

	let localNow = $state(Date.now());
	let scorePush = $state<ScorePushResult | null>(null);
	let endOpen = $state(false);
	let ending = $state(false);
	let toastVisible = $state(false);
	let toastMessage = $state('');

	const screen = $derived(poll.state);
	const match = $derived(screen?.scene === 'match' ? screen.match : null);
	const gone = $derived(!match || poll.errorStatus === 404);
	const running = $derived(match?.clock.runningSince != null);
	const clock = $derived(
		match ? formatClock(elapsedMs(match.clock, poll.serverNow(localNow))) : ''
	);

	const pushNote = $derived(
		match && !match.scoreboardUpdates
			? m.placard_push_not_allowed()
			: scorePush === 'updated' || scorePush === 'unchanged'
				? m.placard_push_updated()
				: scorePush === 'not_live'
					? m.placard_push_not_live()
					: m.placard_push_hint()
	);

	onMount(() => {
		const stop = poll.start();
		let frame = requestAnimationFrame(function tick() {
			localNow = Date.now();
			frame = requestAnimationFrame(tick);
		});
		return () => {
			stop();
			cancelAnimationFrame(frame);
		};
	});

	function showError(message: string) {
		toastMessage = message;
		toastVisible = true;
	}

	/**
	 * Applies the action on screen at once, then sends it. The server's answer (or the next poll)
	 * replaces the guess; a failure shows a toast and reloads the state. The page never leaves on
	 * an error (the old one sent the operator back to the game list on any failed save).
	 */
	async function send(action: PlacardAction) {
		const current = poll.state;
		if (!current?.match) return;
		// Match actions are guessed locally; server actions (end, ad break) wait for the answer.
		if (action.type !== 'end' && action.type !== 'show_ad') {
			const next = applyAction(current.match, action, poll.serverNow());
			poll.state = {
				...current,
				match: { ...current.match, ...next }
			} satisfies PlacardPublicState;
		}

		const sentAt = Date.now();
		try {
			const response = await fetch(`/api/placard/${current.id}/acoes`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(action)
			});
			if (!response.ok) {
				const reason =
					response.status === 409
						? ((await response.json().catch(() => null)) as { reason?: string } | null)?.reason
						: null;
				showError(
					response.status === 429
						? m.placard_error_too_fast()
						: reason === 'ad_cooldown'
							? m.placard_ads_error_cooldown()
							: reason === 'busy'
								? m.placard_ads_error_busy()
								: reason === 'ad_not_found'
									? m.placard_ads_error_gone()
									: m.placard_error_action()
				);
				await poll.refresh();
				return;
			}
			const body = (await response.json()) as {
				state: PlacardPublicState;
				scorePush: ScorePushResult | null;
			};
			poll.accept(body.state, sentAt);
			if (body.scorePush) scorePush = body.scorePush;
		} catch {
			showError(m.placard_error_offline());
			await poll.refresh();
		}
	}

	const score = (side: PlacardSide, delta: 1 | -1) => send({ type: 'score', side, delta });

	// Ad breaks: the server preselects the next ad in rotation; tapping another one overrides it
	// until the break starts, then the selection follows the rotation again.
	let pickedAdId = $state<number | null>(null);
	let showingAd = $state(false);
	const ads = $derived(screen?.controls?.ads ?? []);
	const selectedAd = $derived(
		ads.find((ad) => ad.id === pickedAdId) ??
			ads.find((ad) => ad.id === screen?.controls?.nextAdId) ??
			ads[0] ??
			null
	);
	const serverNow = $derived(poll.serverNow(localNow));
	const adOnScreen = $derived(activeOverlay(screen?.overlay ?? null, serverNow));
	const adWaitMs = $derived(Math.max(0, (screen?.controls?.adAvailableAt ?? 0) - serverNow));
	const adLabel = $derived(
		adOnScreen
			? m.placard_ads_showing({ seconds: Math.ceil((adOnScreen.endsAt - serverNow) / 1000) })
			: adWaitMs > 0
				? m.placard_ads_wait({ time: formatClock(adWaitMs + 999) })
				: m.placard_ads_show({ seconds: selectedAd?.durationSeconds ?? 0 })
	);

	async function showAd() {
		if (!selectedAd || showingAd) return;
		showingAd = true;
		await send({ type: 'show_ad', adId: selectedAd.id });
		pickedAdId = null;
		showingAd = false;
	}

	async function end() {
		ending = true;
		await send({ type: 'end' });
		ending = false;
		endOpen = false;
		await goto('/placard/controlo');
	}
</script>

<svelte:head>
	<title>{m.placard_control_title()} · {m.feed_brand()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if gone || !match}
	<EmptyState
		icon={MonitorIcon}
		title={m.placard_control_gone()}
		description={m.placard_control_gone_hint()}
	>
		{#snippet action()}
			<Button href="/placard/controlo" variant="tinted">{m.placard_list_title()}</Button>
		{/snippet}
	</EmptyState>
{:else}
	<header class="px-1 pb-3">
		<h1 class="text-title-1 text-ink">{m.placard_control_title()}</h1>
	</header>

	<div class="space-y-4">
		<!-- What the TV shows -->
		<section
			class="rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line dark:ring-0"
			aria-label={m.placard_control_preview()}
		>
			<p class="text-title-2 text-ink-secondary tabular-nums" aria-live="off">{clock}</p>
			<p class="mt-1 flex items-center justify-center gap-1 text-scoreboard text-ink tabular-nums">
				<span class="grid min-w-[1.2ch] justify-items-center overflow-hidden">
					{#key match.homeScore}
						<span class="col-start-1 row-start-1" in:rollIn={{ tint: false }} out:rollOut>
							{match.homeScore}
						</span>
					{/key}
				</span>
				<span class="text-ink-tertiary" aria-hidden="true">–</span>
				<span class="grid min-w-[1.2ch] justify-items-center overflow-hidden">
					{#key match.awayScore}
						<span class="col-start-1 row-start-1" in:rollIn={{ tint: false }} out:rollOut>
							{match.awayScore}
						</span>
					{/key}
				</span>
			</p>
			<p class="mt-1 text-footnote font-semibold text-accent-text">
				{match.clock.period === 'half_time'
					? m.placard_half_time()
					: match.clock.period === 'second_half'
						? m.placard_second_half()
						: m.placard_first_half()}
			</p>
		</section>

		<!-- Score -->
		<section class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
			{#each [{ side: 'home', team: match.home, value: match.homeScore }, { side: 'away', team: match.away, value: match.awayScore }] as const as row (row.side)}
				<div class="flex items-center gap-3 px-4 py-3 not-first:border-t not-first:border-line">
					<Emblem name={row.team.name} src={row.team.emblem} size={32} plate={false} decorative />
					<span class="min-w-0 flex-1 truncate text-headline text-ink">{row.team.name}</span>
					<IconButton
						variant="fill"
						label={m.placard_score_down({ team: row.team.name })}
						disabled={row.value === 0}
						onclick={() => score(row.side, -1)}
					>
						<MinusIcon size={20} weight="bold" />
					</IconButton>
					<span class="w-8 text-center text-title-2 text-ink tabular-nums">{row.value}</span>
					<button
						type="button"
						class="grid size-13 pressable place-items-center rounded-full bg-accent text-accent-fg"
						aria-label={m.placard_score_up({ team: row.team.name })}
						onclick={() => score(row.side, 1)}
					>
						<PlusIcon size={24} weight="bold" />
					</button>
				</div>
			{/each}
		</section>
		<p class="px-4 text-footnote text-ink-tertiary">{pushNote}</p>

		<!-- Clock -->
		<section
			class="flex items-center justify-between gap-1 rounded-card bg-surface px-3 py-3 ring-1 ring-line dark:ring-0"
			aria-label={m.placard_clock_group()}
		>
			<IconButton
				variant="fill"
				label={m.placard_clock_minus()}
				onclick={() => send({ type: 'clock_adjust', deltaMs: -MINUTE_MS })}
			>
				<RewindIcon size={20} weight="fill" />
			</IconButton>
			<IconButton
				variant="fill"
				label={m.placard_clock_reset()}
				onclick={() => send({ type: 'clock_reset' })}
			>
				<ArrowCounterClockwiseIcon size={20} weight="bold" />
			</IconButton>
			<button
				type="button"
				class="grid size-16 pressable place-items-center rounded-full bg-accent text-accent-fg"
				aria-label={running ? m.placard_clock_pause() : m.placard_clock_start()}
				onclick={() => send({ type: 'clock_toggle' })}
			>
				{#if running}<PauseIcon size={28} weight="fill" />{:else}<PlayIcon
						size={28}
						weight="fill"
					/>{/if}
			</button>
			<IconButton
				variant="fill"
				label={m.placard_clock_half_time()}
				disabled={match.clock.period !== 'first_half'}
				onclick={() => send({ type: 'half_time' })}
			>
				<CoffeeIcon size={20} weight="bold" />
			</IconButton>
			<IconButton
				variant="fill"
				label={m.placard_clock_plus()}
				onclick={() => send({ type: 'clock_adjust', deltaMs: MINUTE_MS })}
			>
				<FastForwardIcon size={20} weight="fill" />
			</IconButton>
		</section>

		<!-- Ad break: pick an ad (the next in rotation is preselected), then show it. -->
		<section
			class="rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0"
			aria-labelledby="ads-title"
		>
			<h2 id="ads-title" class="text-headline text-ink">{m.placard_ads_title()}</h2>
			{#if ads.length === 0}
				<p class="mt-1 text-footnote text-ink-tertiary">{m.placard_ads_none()}</p>
			{:else}
				<div
					class="mt-3 flex gap-2 overflow-x-auto pb-1"
					role="group"
					aria-label={m.placard_ads_pick()}
				>
					{#each ads as ad, index (ad.id)}
						<button
							type="button"
							class={[
								'relative w-24 shrink-0 pressable overflow-hidden rounded-inner bg-black ring-2',
								ad.id === selectedAd?.id ? 'ring-accent' : 'ring-transparent'
							]}
							aria-pressed={ad.id === selectedAd?.id}
							aria-label={m.placard_ads_spot({ number: index + 1, seconds: ad.durationSeconds })}
							onclick={() => (pickedAdId = ad.id)}
						>
							<img src={ad.image} alt="" class="aspect-video w-full object-contain" />
							<span
								class="absolute right-1 bottom-1 rounded-badge bg-black/70 px-1 text-caption text-white tabular-nums"
							>
								{ad.durationSeconds}s
							</span>
						</button>
					{/each}
				</div>
				<Button
					class="mt-3"
					icon={MegaphoneIcon}
					size="lg"
					full
					disabled={!selectedAd || !!adOnScreen || adWaitMs > 0}
					loading={showingAd}
					onclick={showAd}
				>
					<span class="tabular-nums">{adLabel}</span>
				</Button>
				<p class="mt-2 text-footnote text-ink-tertiary">{m.placard_ads_hint()}</p>
			{/if}
		</section>

		{#if poll.failures >= 2}
			<p class="px-4 text-footnote text-danger" role="status">{m.placard_error_offline()}</p>
		{/if}

		<Button variant="destructive" size="lg" full onclick={() => (endOpen = true)}>
			{m.placard_end()}
		</Button>
	</div>
{/if}

<Sheet bind:open={endOpen} title={m.placard_end_title()}>
	<p class="text-subhead text-ink-secondary">{m.placard_end_text()}</p>
	<div class="mt-5 flex flex-col gap-2">
		<Button variant="destructive" size="lg" full loading={ending} onclick={end}>
			{m.placard_end_confirm()}
		</Button>
		<Button variant="plain" size="lg" full onclick={() => (endOpen = false)}
			>{m.placard_cancel()}</Button
		>
	</div>
</Sheet>

<Toast bind:visible={toastVisible} message={toastMessage} tone="error" />
