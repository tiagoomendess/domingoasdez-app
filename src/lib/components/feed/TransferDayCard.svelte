<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import ArrowBendDownRightIcon from 'phosphor-svelte/lib/ArrowBendDownRightIcon';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import { formatDayMonth, todayInLisbon } from '#lib/format.ts';
	import { m } from '#lib/messages.ts';
	import { TRANSFER_FEED_PREVIEW, transfersHref, type TransferView } from '#lib/transfers.ts';

	type Props = {
		day: string;
		total: number;
		transfers: TransferView[];
		moreHref: string | null;
	};

	let { day, total, transfers, moreHref }: Props = $props();

	let track: HTMLElement | undefined;
	let current = $state(0);

	const dayLabel = $derived(day === todayInLisbon() ? m.date_today() : formatDayMonth(day));
	const slideCount = $derived(transfers.length + (moreHref ? 1 : 0));
	const carousel = $derived(slideCount > 1);
	const dots = $derived(Array.from({ length: slideCount }, (_, index) => index));

	/**
	 * The slide whose start is closest to the track's start; the last one once scrolled to
	 * the end. Scroll events already fire at most once per frame, so no extra throttling.
	 */
	function syncCurrent() {
		if (!track) return;
		const slides = track.children;
		if (slides.length < 2) return;
		const step = (slides[1] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft;
		const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
		current = atEnd
			? slides.length - 1
			: Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / step)));
	}

	function go(direction: -1 | 1) {
		if (!track) return;
		const target = track.children[current + direction] as HTMLElement | undefined;
		if (!target) return;
		const first = track.children[0] as HTMLElement;
		track.scrollTo({
			left: target.offsetLeft - first.offsetLeft,
			behavior: prefersReducedMotion.current ? 'instant' : 'smooth'
		});
	}
</script>

{#snippet slide(transfer: TransferView)}
	<div
		class="relative flex h-full items-center gap-3 rounded-inner bg-fill p-2.5 outline-accent transition-transform duration-(--dur-press) ease-snappy has-[a:active]:scale-98 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 motion-reduce:has-[a:active]:scale-100"
	>
		<span class="relative shrink-0">
			<Avatar name={transfer.playerName} src={transfer.picture} size={48} />
			{#if transfer.toHref}
				<!-- The new club, worn like a badge. drop-shadow follows the crest's own outline -->
				<span
					class="absolute -right-1.5 -bottom-1 grid size-6 place-items-center drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.45)]"
				>
					<Emblem
						name={transfer.toLabel}
						src={transfer.toEmblem}
						size={24}
						plate={false}
						decorative
					/>
				</span>
			{/if}
		</span>
		<span class="min-w-0 flex-1">
			<span class="block truncate text-callout font-semibold text-ink">
				{#if transfer.href}
					<a
						href={transfer.href}
						class="after:absolute after:inset-0 after:rounded-inner focus-visible:outline-none"
					>
						{transfer.playerName}
					</a>
				{:else}
					{transfer.playerName}
				{/if}
			</span>
			<span class="block truncate text-footnote text-ink-tertiary">{transfer.fromLabel}</span>
			<span class="flex items-center gap-1 text-footnote font-medium text-ink-secondary">
				<ArrowBendDownRightIcon size={14} weight="bold" class="shrink-0 text-accent-text" />
				<span class="sr-only">{m.transfer_to()}</span>
				<span class="truncate">{transfer.toLabel}</span>
			</span>
		</span>
	</div>
{/snippet}

<article class="rounded-card bg-surface p-2.5 ring-1 ring-line dark:ring-0">
	<header class="flex h-8 items-center justify-between gap-3 pr-1 pl-1.5">
		<a
			href={transfersHref(day)}
			class="-my-1.5 inline-flex min-h-11 min-w-0 items-center gap-1.5 text-footnote font-semibold text-ink-secondary hover:text-ink"
		>
			<ArrowsLeftRightIcon size={16} weight="bold" class="shrink-0 text-accent-text" />
			<span class="truncate">
				{total > 1 ? m.transfer_card_count({ count: total }) : m.transfer_card_label()}
				<span aria-hidden="true" class="mx-0.5 text-ink-tertiary">·</span>
				<time datetime={day} class="font-normal text-ink-tertiary">{dayLabel}</time>
			</span>
		</a>

		{#if carousel}
			<span aria-hidden="true" class="flex shrink-0 items-center gap-1 pointer-fine:hidden">
				{#each dots as dot (dot)}
					<span
						class={[
							'h-1.5 rounded-full transition-all duration-(--dur-base) ease-snappy',
							dot === current ? 'w-3.5 bg-accent' : 'w-1.5 bg-fill-strong'
						]}
					></span>
				{/each}
			</span>
			<!-- Mouse users can't swipe: arrows replace the dots on precise pointers -->
			<span class="hidden shrink-0 items-center gap-1.5 pointer-fine:flex">
				<button
					type="button"
					aria-label={m.transfer_prev()}
					disabled={current === 0}
					class="grid size-8 pressable place-items-center rounded-full bg-fill text-ink hover:bg-fill-strong disabled:pointer-events-none disabled:opacity-40"
					onclick={() => go(-1)}
				>
					<CaretLeftIcon size={14} weight="bold" />
				</button>
				<button
					type="button"
					aria-label={m.transfer_next()}
					disabled={current === slideCount - 1}
					class="grid size-8 pressable place-items-center rounded-full bg-fill text-ink hover:bg-fill-strong disabled:pointer-events-none disabled:opacity-40"
					onclick={() => go(1)}
				>
					<CaretRightIcon size={14} weight="bold" />
				</button>
			</span>
		{/if}
	</header>

	{#if !carousel && transfers[0]}
		<div class="mt-1.5">
			{@render slide(transfers[0])}
		</div>
	{:else if carousel}
		<!-- Bleeds to the card edge so the next slide peeks in from the side -->
		<div
			{@attach (node) => {
				track = node;
			}}
			role="region"
			aria-roledescription="carousel"
			aria-label={m.transfer_carousel_label({ date: dayLabel })}
			class="relative -mx-2.5 mt-1.5 flex snap-x snap-mandatory scroll-px-2.5 [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-2.5 [&::-webkit-scrollbar]:hidden"
			onscroll={syncCurrent}
		>
			{#each transfers as transfer, index (transfer.id)}
				<div
					role="group"
					aria-roledescription="slide"
					aria-label={m.transfer_slide_label({ index: index + 1, total: slideCount })}
					class="w-[86%] shrink-0 snap-start"
				>
					{@render slide(transfer)}
				</div>
			{/each}
			{#if moreHref}
				<div
					role="group"
					aria-roledescription="slide"
					aria-label={m.transfer_slide_label({ index: slideCount, total: slideCount })}
					class="w-[86%] shrink-0 snap-start"
				>
					<a
						href={moreHref}
						class="flex h-full pressable items-center gap-3 rounded-inner bg-accent-tint p-2.5 text-accent-text outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
					>
						<span
							class="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-fg"
						>
							<ArrowRightIcon size={20} weight="bold" />
						</span>
						<span class="min-w-0">
							<span class="block text-callout font-semibold">
								{m.transfer_see_all({ count: total })}
							</span>
							<span class="block text-footnote">
								{m.transfer_see_all_text({ count: total - TRANSFER_FEED_PREVIEW })}
							</span>
						</span>
					</a>
				</div>
			{/if}
		</div>
	{/if}
</article>
