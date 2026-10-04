<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
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

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const pathname = $derived(page.url.pathname);
	const tabs = $derived(getTabs(page.data.user ?? null));
	const current = $derived(getActiveTab(pathname));
	const showBack = $derived((page.data.preferences?.backButton ?? true) && !isTabRoot(pathname));
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

<NavigationProgress />

<div aria-hidden="true" class="scroll-edge-top z-30"></div>
<div aria-hidden="true" class="scroll-edge-bottom z-30"></div>

<BackButton
	{fallback}
	visible={showBack}
	class="fixed top-[calc(var(--safe-top)+var(--chrome-inset))] left-(--chrome-inset) z-40"
/>
<ThemeToggle
	class="fixed top-[calc(var(--safe-top)+var(--chrome-inset))] right-(--chrome-inset) z-40"
/>

<main class={['page-container', isReading && 'max-w-[42.5rem]!']}>
	{@render children()}
</main>

<Toast bind:visible={toastVisible} message={toastMessage} tone={toastTone} duration={6000} />

<TabBar {tabs} {current} {onselect} />
