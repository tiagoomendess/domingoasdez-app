<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadRecaptcha } from '#lib/captcha.ts';
	import { getLocale, m } from '#lib/messages.ts';

	type Props = {
		siteKey: string;
		onsolved?: (token: string) => void;
	};

	let { siteKey, onsolved }: Props = $props();

	let failed = $state(false);

	function widget(key: string): Attachment {
		return (element) => {
			let widgetId: number | undefined;
			let cancelled = false;

			loadRecaptcha()
				.then(() => {
					if (cancelled || !window.grecaptcha) return;
					const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
					widgetId = window.grecaptcha.render(element, {
						sitekey: key,
						theme,
						hl: getLocale().slice(0, 2),
						callback: (token) => onsolved?.(token),
						'expired-callback': () => onsolved?.(''),
						'error-callback': () => onsolved?.('')
					});
				})
				.catch(() => {
					if (!cancelled) failed = true;
				});

			return () => {
				cancelled = true;
				if (widgetId != null) window.grecaptcha?.reset(widgetId);
			};
		};
	}
</script>

<div class="min-h-[78px]">
	<div {@attach widget(siteKey)}></div>
	{#if failed}
		<p class="text-footnote text-danger">{m.captcha_load_error()}</p>
	{/if}
</div>
