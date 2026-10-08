<script lang="ts">
	import { navigating } from '$app/state';
	import { isTabSwitch } from '#lib/navigation.svelte.ts';
	import { m } from '#lib/messages.ts';

	const pending = $derived.by(() => {
		const from = navigating.from;
		const to = navigating.to;
		if (!from || !to) return false;
		return isTabSwitch(from.url.pathname, to.url.pathname);
	});
</script>

{#if pending}
	<div
		class="nav-progress pointer-events-none fixed inset-x-0 z-50 h-[3px] overflow-hidden"
		style:top="max(var(--safe-top), var(--anchor-offset))"
		role="progressbar"
		aria-label={m.loading()}
	>
		<span class="nav-progress-bar block h-full bg-accent shadow-[0_0_10px_var(--accent)]"></span>
	</div>
{/if}

<style>
	/* Stay invisible briefly so a fast tap doesn't flash the bar. */
	.nav-progress {
		opacity: 0;
		animation: nav-progress-in 1ms linear 140ms forwards;
	}

	.nav-progress-bar {
		width: 35%;
		animation: nav-progress 1.05s cubic-bezier(0.32, 0.72, 0, 1) infinite;
	}

	@keyframes nav-progress-in {
		to {
			opacity: 1;
		}
	}

	@keyframes nav-progress {
		0% {
			transform: translateX(-120%);
		}
		100% {
			transform: translateX(380%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-progress {
			opacity: 1;
			animation: none;
		}

		.nav-progress-bar {
			width: 100%;
			animation: none;
		}
	}
</style>
