<script lang="ts">
	import { fade } from 'svelte/transition';
	import { materialize } from '#lib/motion.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		visible: boolean;
	};

	let { visible }: Props = $props();
</script>

<!-- Always mounted, so screen readers announce the text when it appears -->
<div role="status" class="sr-only">{visible ? m.loading() : ''}</div>

<!--
	Sits between the scroll-edge fades (z-30) and the chrome (z-40): the page washes out
	while the tab bar and floating buttons stay crisp. Blocking is done by `inert` on <main>.
-->
{#if visible}
	<div
		aria-hidden="true"
		transition:fade={{ duration: 240 }}
		class="pointer-events-none fixed inset-0 z-35 grid place-items-center bg-canvas/55"
	>
		<span
			transition:materialize
			class="flex size-14 items-center justify-center rounded-full glass"
		>
			<span
				class="size-6 animate-spin rounded-full border-[2.5px] border-accent border-r-transparent motion-reduce:[animation-duration:1.6s]"
			></span>
		</span>
	</div>
{/if}
