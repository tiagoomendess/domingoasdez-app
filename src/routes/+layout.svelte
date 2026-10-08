<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import { page } from '$app/state';
	import AnalyticsPageViews from '#lib/components/analytics/AnalyticsPageViews.svelte';
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import { m } from '#lib/messages.ts';

	let { children } = $props();

	const bare = $derived(page.url.pathname.startsWith('/design'));

	// PWA standalone: black-translucent draws under the status bar and clips chrome.
	// Switch to default so the viewport starts below the status bar.
	onMount(() => {
		const nav = navigator as Navigator & { standalone?: boolean };
		const standalone =
			window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone);
		if (!standalone) return;
		for (const meta of document.querySelectorAll(
			'meta[name="apple-mobile-web-app-status-bar-style"]'
		)) {
			meta.setAttribute('content', 'default');
		}
	});
</script>

<AnalyticsPageViews />

<svelte:head>
	<!-- Round mark for browser tabs -->
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
	<link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
	<!-- Square source; iOS/Android apply the rounded-square mask on home screen -->
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content={m.feed_brand()} />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="application-name" content={m.feed_brand()} />
	<link rel="describedby" href="/llms.txt" />
</svelte:head>

{#if bare}
	{@render children()}
{:else}
	<AppShell>
		{@render children()}
	</AppShell>
{/if}
