<script lang="ts">
	import type { Snippet } from 'svelte';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { m } from '#lib/messages.ts';

	type Props = {
		open: boolean;
		title: string;
		children: Snippet;
	};

	let { open = $bindable(false), title, children }: Props = $props();

	const uid = $props.id();
	const DISMISS_DISTANCE = 120;
	const DISMISS_VELOCITY = 0.5; // px per ms, downward

	let dragY = $state(0);
	let dragging = $state(false);
	let drag = { startY: 0, lastY: 0, lastTime: 0, velocity: 0 };

	function sync(dialog: HTMLDialogElement) {
		if (open && !dialog.open) {
			dragY = 0;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}

	/** Progressive resistance when pulling the sheet up past its resting point */
	function rubberband(overshoot: number, dimension = 400, constant = 0.55) {
		return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
	}

	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0 || window.matchMedia('(width >= 48rem)').matches) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragging = true;
		drag = { startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, velocity: 0 };
	}

	function onpointermove(event: PointerEvent) {
		if (!dragging) return;
		const offset = event.clientY - drag.startY;
		dragY = offset > 0 ? offset : rubberband(offset);

		const elapsed = event.timeStamp - drag.lastTime;
		if (elapsed > 0) drag.velocity = (event.clientY - drag.lastY) / elapsed;
		drag.lastY = event.clientY;
		drag.lastTime = event.timeStamp;
	}

	function onpointerup() {
		if (!dragging) return;
		dragging = false;
		if (dragY > DISMISS_DISTANCE || drag.velocity > DISMISS_VELOCITY) open = false;
		else dragY = 0;
	}
</script>

<dialog
	{@attach sync}
	aria-labelledby="{uid}-title"
	class={['sheet glass-thick text-ink', dragging && 'dragging']}
	style:--drag-y="{dragY}px"
	onclose={() => (open = false)}
	onclick={(event) => {
		if (event.target === event.currentTarget) open = false;
	}}
>
	<div class="flex max-h-[inherit] flex-col">
		<div
			role="presentation"
			class="shrink-0 touch-none px-5 pt-2 pb-3 select-none"
			{onpointerdown}
			{onpointermove}
			{onpointerup}
			onpointercancel={onpointerup}
		>
			<div
				aria-hidden="true"
				class="mx-auto mb-2 h-1.5 w-10 rounded-full bg-fill-strong md:hidden"
			></div>
			<div class="flex items-center justify-between gap-3">
				<h2 id="{uid}-title" class="text-title-3">{title}</h2>
				<IconButton
					variant="fill"
					label={m.action_close()}
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => (open = false)}
				>
					<XIcon size={18} weight="bold" />
				</IconButton>
			</div>
		</div>
		<div class="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	.sheet {
		position: fixed;
		inset: auto 0 0 0;
		margin: 0 auto;
		width: 100%;
		max-width: 32rem;
		max-height: calc(100dvh - var(--safe-top) - 2rem);
		padding: 0 0 var(--safe-bottom);
		border: 0;
		border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
		translate: 0 var(--drag-y);
		transition:
			transform var(--dur-slow) var(--ease-fluid),
			translate var(--dur-slow) var(--ease-fluid),
			opacity var(--dur-slow) var(--ease-fluid),
			overlay var(--dur-slow) allow-discrete,
			display var(--dur-slow) allow-discrete;
	}

	.sheet:not([open]) {
		transform: translateY(100%);
	}

	@starting-style {
		.sheet[open] {
			transform: translateY(100%);
		}
	}

	.sheet.dragging {
		transition: none;
	}

	.sheet::backdrop {
		background-color: var(--scrim);
		transition:
			opacity var(--dur-slow) var(--ease-fluid),
			overlay var(--dur-slow) allow-discrete,
			display var(--dur-slow) allow-discrete;
	}

	.sheet:not([open])::backdrop {
		opacity: 0;
	}

	@starting-style {
		.sheet[open]::backdrop {
			opacity: 0;
		}
	}

	@media (width >= 48rem) {
		.sheet {
			inset: 0;
			margin: auto;
			max-width: 27.5rem;
			height: fit-content;
			padding-bottom: 0;
			border-radius: var(--radius-sheet);
		}

		.sheet:not([open]) {
			transform: scale(0.94);
			opacity: 0;
		}

		@starting-style {
			.sheet[open] {
				transform: scale(0.94);
				opacity: 0;
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet:not([open]) {
			transform: none;
			opacity: 0;
		}

		@starting-style {
			.sheet[open] {
				transform: none;
				opacity: 0;
			}
		}
	}

	:global(html:has(dialog.sheet[open])) {
		overflow: hidden;
	}
</style>
