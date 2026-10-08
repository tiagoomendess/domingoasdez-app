<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import BackButton from './BackButton.svelte';
	import NavigationProgress from './NavigationProgress.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import TabBar from './TabBar.svelte';
	import AdSenseTopAnchor from '#lib/components/ads/AdSenseTopAnchor.svelte';
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

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const pathname = $derived(page.url.pathname);
	const copyrightYear = new Date().getFullYear();
	const showAds = $derived(page.data.showAds !== false);
	const tabs = $derived(getTabs(page.data.user ?? null));
	const current = $derived(getActiveTab(pathname));
	const backEnabled = $derived(page.data.preferences?.backButton ?? true);
	const showTheme = $derived(page.data.preferences?.themeButton ?? true);
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

	afterNavigate(() => {
		const toast = page.data.toast;
		if (!toast?.message) return;
		toastMessage = toast.message;
		toastTone = toast.tone ?? 'info';
		toastVisible = true;
	});

	function onselect(id: string) {
		setLastTab(id as TabId);
	}
</script>

<div class={['contents', noTopChrome && 'no-top-chrome']}>
	{#if showAds}
		<AdSenseTopAnchor />
	{/if}

	<NavigationProgress />

	<div aria-hidden="true" class="scroll-edge-top z-30"></div>
	<div aria-hidden="true" class="scroll-edge-bottom z-30"></div>

	<BackButton
		{fallback}
		visible={showBack}
		class="fixed top-[calc(var(--adsense-top-pad,var(--safe-top))+var(--chrome-inset))] left-(--chrome-inset) z-40"
	/>
	{#if showTheme}
		<ThemeToggle
			class="fixed top-[calc(var(--adsense-top-pad,var(--safe-top))+var(--chrome-inset))] right-(--chrome-inset) z-40"
		/>
	{/if}

	<main class={['page-container', isReading && 'max-w-[42.5rem]!']}>
		{@render children()}
		<footer class="mt-10 border-t border-line pt-4 text-center text-footnote text-ink-tertiary">
			<p>© 2014–{copyrightYear} {m.feed_brand()}</p>
			{#if showAds}
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

	<TabBar {tabs} {current} {onselect} />
</div>
