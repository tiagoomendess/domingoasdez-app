<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import MinusIcon from 'phosphor-svelte/lib/MinusIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import { m } from '#lib/messages.ts';
	import { clampScore } from '#lib/score-reports.ts';

	type Club = { name: string; emblem: string | null };
	type AlreadySent = { homeScore: number; awayScore: number; finished: boolean };

	type Props = {
		initialHome: number;
		initialAway: number;
		initialFinished: boolean;
		originalHome: number;
		originalAway: number;
		originalFinished: boolean;
		home: Club;
		away: Club;
		returnTo: string;
		accepting: boolean;
		canFinish: boolean;
		banned: boolean;
		alreadySent: AlreadySent[];
		loggedIn: boolean;
		recaptchaSiteKey: string | null;
	};

	let {
		initialHome,
		initialAway,
		initialFinished,
		originalHome,
		originalAway,
		originalFinished,
		home,
		away,
		returnTo,
		accepting,
		canFinish,
		banned,
		alreadySent,
		loggedIn,
		recaptchaSiteKey
	}: Props = $props();

	let homeOffset = $state(0);
	let awayOffset = $state(0);
	let finishedOverride = $state<boolean | null>(null);
	let latitude = $state('');
	let longitude = $state('');
	let accuracy = $state('');
	let submitting = $state(false);
	let gettingLocation = $state(false);
	let whyOpen = $state(false);
	let locationReady = false;

	const homeScore = $derived(clampScore(initialHome + homeOffset));
	const awayScore = $derived(clampScore(initialAway + awayOffset));
	const finished = $derived(finishedOverride ?? initialFinished);

	const dirty = $derived(
		homeScore !== originalHome || awayScore !== originalAway || finished !== originalFinished
	);
	const canSend = $derived(dirty && accepting && !banned && !submitting);
	const showCaptcha = $derived(dirty && !loggedIn && Boolean(recaptchaSiteKey));
	const showLoginHint = $derived(dirty && !loggedIn);
	const loginHref = $derived(
		`/conta/entrar?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`
	);

	function bump(side: 'home' | 'away', delta: number) {
		if (side === 'home') {
			homeOffset = clampScore(initialHome + homeOffset + delta) - initialHome;
		} else {
			awayOffset = clampScore(initialAway + awayOffset + delta) - initialAway;
		}
	}

	function getLocation(): Promise<GeolocationPosition | null> {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			return Promise.resolve(null);
		}
		return new Promise((resolve) => {
			const timer = setTimeout(() => resolve(null), 8_000);
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					clearTimeout(timer);
					resolve(pos);
				},
				() => {
					clearTimeout(timer);
					resolve(null);
				},
				{ enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 }
			);
		});
	}

	function formatAlreadySent(report: AlreadySent) {
		const score = `${report.homeScore}–${report.awayScore}`;
		return report.finished ? `${score} · ${m.score_report_finished_yes()}` : score;
	}
</script>

<svelte:head>
	{#if showCaptcha}
		<script src="https://www.google.com/recaptcha/api.js" async defer></script>
	{/if}
</svelte:head>

<form
	method="POST"
	class="space-y-5"
	use:enhance={({ cancel, formElement }) => {
		if (!locationReady) {
			cancel();
			void (async () => {
				submitting = true;
				gettingLocation = true;
				const pos = await getLocation();
				gettingLocation = false;
				if (pos) {
					latitude = String(pos.coords.latitude);
					longitude = String(pos.coords.longitude);
					accuracy = String(pos.coords.accuracy);
				} else {
					latitude = '';
					longitude = '';
					accuracy = '';
				}
				locationReady = true;
				formElement.requestSubmit();
			})();
			return;
		}

		locationReady = false;
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="home_score" value={homeScore} />
	<input type="hidden" name="away_score" value={awayScore} />
	<input type="hidden" name="finished" value={finished ? 'true' : 'false'} />
	<input type="hidden" name="latitude" value={latitude} />
	<input type="hidden" name="longitude" value={longitude} />
	<input type="hidden" name="accuracy" value={accuracy} />
	<input type="hidden" name="return_to" value={returnTo} />

	<div class="flex items-start gap-3 sm:gap-4">
		<div class="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
			<Emblem src={home.emblem} name={home.name} size={72} plate={false} decorative />
			<span class="line-clamp-2 text-subhead text-ink">{home.name}</span>
			{#if accepting && !banned}
				<div class="flex items-center gap-2">
					<IconButton
						variant="fill"
						label={m.score_report_home_down()}
						disabled={homeScore <= 0 || submitting}
						onclick={() => bump('home', -1)}
					>
						<MinusIcon size={18} weight="bold" />
					</IconButton>
					<IconButton
						variant="fill"
						label={m.score_report_home_up()}
						disabled={submitting}
						onclick={() => bump('home', 1)}
					>
						<PlusIcon size={18} weight="bold" />
					</IconButton>
				</div>
			{/if}
		</div>

		<div class="flex shrink-0 flex-col items-center justify-center gap-1 pt-6 text-center">
			<div
				class="flex items-center justify-center gap-2 text-scoreboard tabular-nums text-ink"
				aria-live="polite"
			>
				<span class="min-w-[1.2ch]">{homeScore}</span>
				<span class="text-ink-tertiary" aria-hidden="true">–</span>
				<span class="min-w-[1.2ch]">{awayScore}</span>
			</div>
			<span class="text-footnote text-ink-tertiary">{m.score_report_vs()}</span>
		</div>

		<div class="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
			<Emblem src={away.emblem} name={away.name} size={72} plate={false} decorative />
			<span class="line-clamp-2 text-subhead text-ink">{away.name}</span>
			{#if accepting && !banned}
				<div class="flex items-center gap-2">
					<IconButton
						variant="fill"
						label={m.score_report_away_down()}
						disabled={awayScore <= 0 || submitting}
						onclick={() => bump('away', -1)}
					>
						<MinusIcon size={18} weight="bold" />
					</IconButton>
					<IconButton
						variant="fill"
						label={m.score_report_away_up()}
						disabled={submitting}
						onclick={() => bump('away', 1)}
					>
						<PlusIcon size={18} weight="bold" />
					</IconButton>
				</div>
			{/if}
		</div>
	</div>

	{#if canFinish && accepting && !banned}
		<label class="flex min-h-11 items-center justify-between gap-3 px-1">
			<span class="text-body text-ink">{m.score_report_finished()}</span>
			<div class="flex items-center gap-2">
				<span class="text-footnote text-ink-tertiary">
					{finished ? m.score_report_finished_yes() : m.score_report_finished_no()}
				</span>
				<Switch
					checked={finished}
					label={m.score_report_finished()}
					disabled={submitting}
					onchange={(checked) => (finishedOverride = checked)}
				/>
			</div>
		</label>
	{/if}

	{#if alreadySent.length > 0}
		<div class="space-y-2">
			<p class="px-1 text-footnote font-semibold text-ink-secondary">
				{m.score_report_already_sent()}
			</p>
			<div class="flex flex-wrap gap-2">
				{#each alreadySent as report (`${report.homeScore}-${report.awayScore}-${report.finished}`)}
					<span
						class="inline-flex h-9 items-center rounded-full bg-fill px-4 text-subhead font-medium tabular-nums text-ink"
					>
						{formatAlreadySent(report)}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if accepting && !banned}
		<div class="flex flex-col gap-3">
			<button
				type="button"
				class="self-start px-1 text-footnote font-medium text-accent-text hover:underline"
				onclick={() => (whyOpen = true)}
			>
				{m.score_report_why_location()}
			</button>

			{#if showCaptcha && recaptchaSiteKey}
				<div class="space-y-2">
					<div class="g-recaptcha" data-sitekey={recaptchaSiteKey}></div>
					<a href={loginHref} class="text-footnote font-medium text-accent-text hover:underline">
						{m.score_report_login_captcha()}
					</a>
				</div>
			{:else if showLoginHint}
				<a href={loginHref} class="text-footnote font-medium text-accent-text hover:underline">
					{m.score_report_login_captcha()}
				</a>
			{/if}

			<Button type="submit" size="lg" full disabled={!canSend} loading={submitting}>
				{gettingLocation ? m.score_report_getting_location() : m.score_report_send()}
			</Button>

			<p class="px-1 text-caption text-ink-tertiary">{m.score_report_disclaimer()}</p>
		</div>
	{/if}
</form>

{#if accepting && !banned}
	<Sheet bind:open={whyOpen} title={m.score_report_why_location_title()}>
		<div class="space-y-3 text-body text-ink-secondary">
			<p>{m.score_report_why_location_p1()}</p>
			<p>{m.score_report_why_location_p2()}</p>
			<p>{m.score_report_why_location_p3()}</p>
		</div>
	</Sheet>
{/if}
