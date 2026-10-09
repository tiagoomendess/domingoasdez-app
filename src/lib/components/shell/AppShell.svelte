<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { watchTopAnchorOffset } from '#lib/top-anchor.ts';
	import BackButton from './BackButton.svelte';
	import NavigationProgress from './NavigationProgress.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import TabBar from './TabBar.svelte';
	import Toast from '#lib/components/ui/Toast.svelte';
	import {
		getTabs,
		getActiveTab,
		setLastTab,
		isTabRoot,
		parentOf,
		type TabId
	} from '#lib/navigation.svelte.ts';
	import { showPrivacySettings } from '#lib/google.ts';
	import { m } from '#lib/messages.ts';

	const LIVE_POLL_MS = 30_000;

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const pathname = $derived(page.url.pathname);
	const copyrightYear = new Date().getFullYear();
	const tabs = $derived(getTabs(page.data.user ?? null));
	const current = $derived(getActiveTab(pathname));
	const backEnabled = $derived(page.data.preferences?.backButton ?? true);
	const showTheme = $derived(page.data.preferences?.themeButton ?? true);
	const adsDisabled = $derived(page.data.adsDisabled ?? false);
	const showBack = $derived(backEnabled && !isTabRoot(pathname));
	// Keep the top inset while either switch is on. The back button is hidden on
	// tab roots, but the space has to stay so it is still visible on inner pages.
	const noTopChrome = $derived(!backEnabled && !showTheme);
	const fallback = $derived(parentOf(pathname));
	const isReading = $derived(
		pathname.startsWith('/noticias/') ||
			pathname.startsWith('/p/') ||
			pathname === '/politica-de-privacidade' ||
			pathname.startsWith('/politica-de-privacidade/') ||
			pathname === '/termos-e-condicoes' ||
			pathname.startsWith('/termos-e-condicoes/') ||
			pathname === '/rgpd' ||
			pathname.startsWith('/rgpd/')
	);

	let toastVisible = $state(false);
	let toastMessage = $state('');
	let toastTone = $state<'info' | 'success' | 'error'>('info');
	// Writable derived: server value after navigations; poll may override between loads.
	let liveNow = $derived(Boolean(page.data.liveNow));
	let pageVisible = $state(
		typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
	);

	afterNavigate(() => {
		const toast = page.data.toast;
		if (!toast?.message) return;
		toastMessage = toast.message;
		toastTone = toast.tone ?? 'info';
		toastVisible = true;
	});

	$effect(() => {
		if (!pageVisible) return;

		let cancelled = false;

		async function tick() {
			try {
				const res = await fetch('/api/jogos/live', { cache: 'no-store' });
				if (!res.ok || cancelled) return;
				const body = (await res.json()) as { live?: boolean };
				if (cancelled || typeof body.live !== 'boolean') return;
				liveNow = body.live;
			} catch {
				// Keep last good value; next tick retries.
			}
		}

		void tick();
		const id = setInterval(tick, LIVE_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	});

	function onselect(id: string) {
		setLastTab(id as TabId);
	}

	function onvisibilitychange() {
		pageVisible = document.visibilityState === 'visible';
	}

	onMount(() => watchTopAnchorOffset());
</script>

<svelte:document {onvisibilitychange} />

<div data-app-root class={['contents', noTopChrome && 'no-top-chrome']}>
	<NavigationProgress />

	<div aria-hidden="true" class="scroll-edge-top z-30"></div>
	<div aria-hidden="true" class="scroll-edge-bottom z-30"></div>

	<BackButton
		{fallback}
		visible={showBack}
		class="fixed top-(--chrome-top) left-(--chrome-inset) z-40"
	/>
	{#if showTheme}
		<ThemeToggle class="fixed top-(--chrome-top) right-(--chrome-inset) z-40" />
	{/if}

	<main class={['page-container', isReading && 'max-w-[42.5rem]!']}>
		{@render children()}
		<footer class="mt-10 border-t border-line pt-4 text-center text-footnote text-ink-tertiary">
			<p>© 2014–{copyrightYear} {m.feed_brand()}</p>
			{#if !adsDisabled}
				<button
					type="button"
					class="mt-1 font-medium text-accent-text hover:underline"
					onclick={showPrivacySettings}
				>
					{m.pages_privacy_cookie_settings()}
				</button>
			{/if}
		</footer>
	</main>

	<Toast bind:visible={toastVisible} message={toastMessage} tone={toastTone} duration={6000} />

	<TabBar {tabs} {current} {onselect} live={liveNow} />
</div>
