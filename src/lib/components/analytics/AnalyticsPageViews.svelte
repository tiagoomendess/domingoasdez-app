<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { PUBLIC_GA_MEASUREMENT_ID } from '$app/env/public';

	afterNavigate(() => {
		if (!PUBLIC_GA_MEASUREMENT_ID) return;
		if (typeof window.gtag !== 'function') return;

		window.gtag('event', 'page_view', {
			page_title: document.title,
			page_location: location.href,
			page_path: location.pathname + location.search
		});
	});
</script>
