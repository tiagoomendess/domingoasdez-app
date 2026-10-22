<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { afterNavigate, refreshAll } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { watchTopAnchorOffset } from '#lib/top-anchor.ts';
	import BackButton from './BackButton.svelte';
	import NavigationLoader from './NavigationLoader.svelte';
	import PullToRefresh from './PullToRefresh.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import TabBar from './TabBar.svelte';
	import Toast from '#lib/components/ui/Toast.svelte';
	import {
		getTabs,
		getActiveTab,
		setLastTab,
		isNavigationLoaderRequested,
		isTabRoot,
		parentOf,
		type TabId
	} from '#lib/navigation.svelte.ts';
	import { showPrivacySettings } from '#lib/google.ts';
	import { pullRefresh } from '#lib/pull-to-refresh.svelte.ts';
	import { m } from '#lib/messages.ts';

	const LIVE_POLL_MS = 30_000;
	/** Fast and preloaded navigations finish before the loader shows, so it never flashes. */
	const LOADER_DELAY_MS = 150;

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

	// A page change is loading. Query-only updates on the same path (the games date rail,
	// competition views) keep their own in-page loading states, unless the page asks for
	// this loader with withNavigationLoader (the feed chips do).
	const pending = $derived.by(() => {
		const { from, to, willUnload } = navigating;
		if (!from || !to || willUnload) return false;
		return from.url.pathname !== to.url.pathname || isNavigationLoaderRequested();
	});
	let loaderVisible = $state(false);

	$effect(() => {
		if (!pending) return;
		const id = setTimeout(() => (loaderVisible = true), LOADER_DELAY_MS);
		return () => {
			clearTimeout(id);
			loaderVisible = false;
		};
	});

	let toastVisible = $state(false);
	let toastMessage = $state('');
	let toastTone = $state<'info' | 'success' | 'error'>('info');
	// Writable derived: server value after navigations; poll may override between loads.
	let liveNow = $derived(Boolean(page.data.liveNow));
	let pageVisible = $state(
		typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
	);

	// The flash cookie is read once, but the root layout's data (and its toast) stays in
	// page.data across client navigations until the layout reloads. Show each toast once.
	let shownToast: unknown = null;

	afterNavigate(() => {
		const toast = page.data.toast;
		if (!toast?.message || toast === shownToast) return;
		shownToast = toast;
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

	<!-- Inert while a page change loads; the chrome around it (tab bar, floating buttons) stays live -->
	<main
		inert={pending}
		aria-busy={pending || undefined}
		class={['page-container', isReading && 'max-w-[42.5rem]!']}
	>
		<PullToRefresh bind:refreshing={pullRefresh.refreshing} onrefresh={refreshAll}>
			<!-- At least a screen tall (the largest, toolbars hidden), so the footer always starts
			     below the fold and is only seen by scrolling down, even on a short page -->
			<div class="min-h-[calc(100lvh-var(--content-top))]">
				{@render children()}
			</div>
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
		</PullToRefresh>
	</main>

	<NavigationLoader visible={loaderVisible} />

	<Toast bind:visible={toastVisible} message={toastMessage} tone={toastTone} />

	<TabBar {tabs} {current} {onselect} live={liveNow} />
</div>
