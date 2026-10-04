<script lang="ts">
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
	import { materialize } from '#lib/motion.ts';

	type Props = {
		visible: boolean;
		message: string;
		tone?: 'info' | 'success' | 'error';
		duration?: number;
	};

	let { visible = $bindable(false), message, tone = 'info', duration = 3000 }: Props = $props();

	const tones = {
		info: { icon: InfoIcon, classes: 'text-accent-text' },
		success: { icon: CheckCircleIcon, classes: 'text-success' },
		error: { icon: WarningCircleIcon, classes: 'text-danger' }
	};

	const ToneIcon = $derived(tones[tone].icon);

	function autoDismiss() {
		const timer = setTimeout(() => (visible = false), duration);
		return () => clearTimeout(timer);
	}
</script>

<div
	aria-live="polite"
	class="pointer-events-none fixed inset-x-0 z-50 grid justify-items-center px-4"
	style:bottom="calc(var(--safe-bottom) + var(--chrome-inset) + var(--tabbar-height) + 0.75rem)"
>
	{#if visible}
		{#key message}
			<div
				{@attach autoDismiss}
				transition:materialize={{ y: 12 }}
				class="pointer-events-auto col-start-1 row-start-1 flex max-w-xs items-center gap-2 rounded-full glass py-2 pr-3.5 pl-3 text-footnote leading-snug font-medium text-ink"
			>
				<ToneIcon size={16} weight="fill" class={['shrink-0', tones[tone].classes]} />
				{message}
			</div>
		{/key}
	{/if}
</div>
