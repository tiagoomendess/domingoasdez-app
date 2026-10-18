<script lang="ts" module>
	import type { Icon } from '#lib/components/types.ts';

	export type SelectOption = {
		value: string;
		label: string;
		/** A photo shown as an Avatar. `null` keeps the avatar slot with initials. */
		image?: string | null;
		/** An icon in a tinted circle, for options that aren't people (own goal, unknown…). */
		icon?: Icon;
		tone?: 'neutral' | 'accent' | 'warning' | 'danger';
		/** Consecutive options with the same group get one header. */
		group?: string;
		/** Extra text the search matches but never shows (e.g. a full legal name). */
		keywords?: string;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import CaretUpDownIcon from 'phosphor-svelte/lib/CaretUpDownIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import XCircleIcon from 'phosphor-svelte/lib/XCircleIcon';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { materialize } from '#lib/motion.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		options: SelectOption[];
		value?: string;
		label: string;
		/** Submitted with the form through a hidden input, like a native select. */
		name?: string;
		placeholder?: string;
		disabled?: boolean;
		/** Show the search field. Defaults to on when there are more than 7 options. */
		searchable?: boolean;
		id?: string;
		class?: string;
		onchange?: (value: string) => void;
	};

	let {
		options,
		value = $bindable(''),
		label,
		name,
		placeholder = '',
		disabled = false,
		searchable,
		id,
		class: className,
		onchange
	}: Props = $props();

	const uid = $props.id();
	const triggerId = $derived(id ?? `${uid}-trigger`);
	const labelId = `${uid}-label`;
	const listId = `${uid}-list`;

	/** Popover under the field for mouse users; a bottom sheet on touch screens. */
	let mode = $state<'popover' | 'sheet'>('sheet');
	let open = $state(false);
	let query = $state('');
	let activeIndex = $state(-1);
	let placement = $state<'below' | 'above'>('below');
	/** A tap can land again on the sheet as it slides up under the finger; ignore it. */
	const CLICK_THROUGH_MS = 350;
	let openedAt = 0;
	let maxHeight = $state(360);
	/** Fixed position of the popover, measured from the field when it opens. */
	let box = $state({ left: 0, width: 0, top: 0, bottom: 0 });

	let trigger: HTMLButtonElement | undefined;
	let search: HTMLInputElement | undefined;
	let list: HTMLElement | undefined;

	/** Attachment that keeps a plain (non-reactive) element reference while mounted. */
	function ref<T extends HTMLElement>(set: (node: T | undefined) => void) {
		return (node: T) => {
			set(node);
			return () => set(undefined);
		};
	}

	const canSearch = $derived(searchable ?? options.length > 7);
	const selected = $derived(options.find((option) => option.value === value));

	const tones = {
		neutral: 'bg-fill-strong text-ink-secondary',
		accent: 'bg-accent-tint text-accent-text',
		warning: 'bg-warning/15 text-warning',
		danger: 'bg-danger/12 text-danger'
	};

	/** Case- and accent-insensitive, so "joao" finds "João". */
	function normalize(text: string) {
		return text
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			.trim();
	}

	const filtered = $derived.by(() => {
		const terms = normalize(query).split(/\s+/).filter(Boolean);
		if (terms.length === 0) return options;
		return options.filter((option) => {
			const haystack = normalize(`${option.label} ${option.keywords ?? ''}`);
			return terms.every((term) => haystack.includes(term));
		});
	});

	const activeId = $derived(activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined);

	function firstEnabled() {
		return filtered.findIndex((option) => !option.disabled);
	}

	/** Scroll only the list (never the page, which would close the popover) to show the highlight. */
	function scrollActive(block: 'center' | 'nearest' = 'nearest') {
		if (activeIndex < 0 || !list) return;
		const row = list.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-opt-${activeIndex}`)}`);
		if (!row) return;
		const box = list.getBoundingClientRect();
		const rect = row.getBoundingClientRect();
		if (block === 'center') {
			list.scrollTop += rect.top - box.top - (box.height - rect.height) / 2;
		} else if (rect.top < box.top) {
			list.scrollTop += rect.top - box.top;
		} else if (rect.bottom > box.bottom) {
			list.scrollTop += rect.bottom - box.bottom;
		}
	}

	function place() {
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const below = window.innerHeight - rect.bottom - 16;
		const above = rect.top - 16;
		placement = below >= 240 || below >= above ? 'below' : 'above';
		maxHeight = Math.max(160, Math.min(360, placement === 'below' ? below : above));
		box = {
			left: rect.left,
			width: rect.width,
			top: rect.bottom + 6,
			bottom: window.innerHeight - rect.top + 6
		};
	}

	async function openList(initialQuery = '') {
		if (disabled || open) return;
		mode = window.matchMedia('(width >= 48rem) and (pointer: fine)').matches ? 'popover' : 'sheet';
		query = initialQuery;
		const current = filtered.findIndex((option) => option.value === value);
		activeIndex = initialQuery || current < 0 ? firstEnabled() : current;
		if (mode === 'popover') place();
		openedAt = performance.now();
		open = true;
		await tick();
		// Only the mouse popover focuses the search: on phones that would throw the keyboard
		// up over the list, and most people just scroll and tap, as with a native picker.
		if (mode === 'popover') (canSearch ? search : list)?.focus({ preventScroll: true });
		scrollActive('center');
	}

	function close(returnFocus = true) {
		open = false;
		query = '';
		if (returnFocus) trigger?.focus({ preventScroll: true });
	}

	function choose(option: SelectOption | undefined) {
		if (!option || option.disabled) return;
		if (option.value !== value) {
			value = option.value;
			onchange?.(option.value);
		}
		close();
	}

	/** Move the highlight by `delta` rows, clamped to the list and skipping disabled rows. */
	async function move(delta: number) {
		const count = filtered.length;
		if (count === 0) return;
		const from = activeIndex < 0 ? (delta > 0 ? -1 : count) : activeIndex;
		let next = Math.min(count - 1, Math.max(0, from + delta));
		const step = Math.sign(delta);
		while (filtered[next]?.disabled && next + step >= 0 && next + step < count) next += step;
		if (!filtered[next]?.disabled) activeIndex = next;
		await tick();
		scrollActive();
	}

	function onListKeydown(event: KeyboardEvent) {
		const inInput = event.currentTarget === search;
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				void move(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				void move(-1);
				break;
			case 'PageDown':
				event.preventDefault();
				void move(8);
				break;
			case 'PageUp':
				event.preventDefault();
				void move(-8);
				break;
			case 'Home':
			case 'End':
				if (inInput) return;
				event.preventDefault();
				void move(event.key === 'Home' ? -filtered.length : filtered.length);
				break;
			case 'Enter':
				event.preventDefault();
				choose(filtered[activeIndex]);
				break;
			case 'Escape':
				// Only the list closes, not a dialog the field happens to sit in
				event.preventDefault();
				event.stopPropagation();
				close();
				break;
			case 'Tab':
				close(false);
				break;
		}
	}

	function onTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			void openList();
			return;
		}
		// Typing on the closed field starts a search, like type-ahead on a native select.
		const printable = event.key.length === 1 && event.key !== ' ';
		if (printable && canSearch && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault();
			void openList(event.key);
		}
	}

	function onQueryInput() {
		activeIndex = firstEnabled();
		if (list) list.scrollTop = 0;
	}

	/**
	 * Shows the popover in the top layer, so no scrolling card, sheet or dialog around the
	 * field can clip it. It closes on a press outside, a resize, or a scroll anywhere but
	 * inside the list itself, like a native select.
	 */
	function topLayerPopover(panel: HTMLElement) {
		panel.showPopover?.();
		const onpointerdown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (panel.contains(target) || trigger?.contains(target)) return;
			close(false);
		};
		const onscroll = (event: Event) => {
			if (event.target instanceof Node && panel.contains(event.target)) return;
			close(false);
		};
		const onresize = () => close(false);
		window.addEventListener('pointerdown', onpointerdown, true);
		window.addEventListener('scroll', onscroll, true);
		window.addEventListener('resize', onresize);
		return () => {
			window.removeEventListener('pointerdown', onpointerdown, true);
			window.removeEventListener('scroll', onscroll, true);
			window.removeEventListener('resize', onresize);
		};
	}
</script>

{#snippet leading(option: SelectOption, size: 28 | 40)}
	{#if option.image !== undefined}
		<Avatar name={option.label} src={option.image} {size} />
	{:else if option.icon}
		{@const OptionIcon = option.icon}
		<span
			aria-hidden="true"
			class={['grid shrink-0 place-items-center rounded-full', tones[option.tone ?? 'neutral']]}
			style:width="{size}px"
			style:height="{size}px"
		>
			<OptionIcon size={size * 0.5} weight="bold" />
		</span>
	{/if}
{/snippet}

{#snippet panel()}
	{#if canSearch}
		<div class={mode === 'popover' ? 'shrink-0 p-1.5 pb-0' : 'pb-2'}>
			<div class="relative">
				<MagnifyingGlassIcon
					size={18}
					aria-hidden="true"
					class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-tertiary"
				/>
				<input
					{@attach ref<HTMLInputElement>((node) => (search = node))}
					bind:value={query}
					type="text"
					role="combobox"
					aria-label={m.select_search()}
					aria-expanded="true"
					aria-controls={listId}
					aria-activedescendant={activeId}
					aria-autocomplete="list"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="done"
					placeholder={m.select_search()}
					class="h-11 w-full rounded-field border-0 bg-fill pr-11 pl-10 text-body text-ink placeholder:text-ink-tertiary focus:ring-2 focus:ring-accent focus:ring-offset-0 focus:outline-none"
					oninput={onQueryInput}
					onkeydown={onListKeydown}
				/>
				{#if query}
					<button
						type="button"
						aria-label={m.select_clear_search()}
						class="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-tertiary hover:text-ink-secondary"
						onclick={() => {
							query = '';
							onQueryInput();
							search?.focus();
						}}
					>
						<XCircleIcon size={18} weight="fill" />
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<ul
		{@attach ref<HTMLElement>((node) => (list = node))}
		id={listId}
		role="listbox"
		aria-labelledby={labelId}
		tabindex={canSearch ? undefined : -1}
		aria-activedescendant={canSearch ? undefined : activeId}
		onkeydown={canSearch ? undefined : onListKeydown}
		class={[
			'min-h-0 overflow-y-auto overscroll-contain focus:outline-none',
			mode === 'popover' ? 'p-1.5' : '-mx-2 h-[min(60dvh,28rem)] px-2'
		]}
	>
		{#each filtered as option, index (option.value)}
			{#if option.group && option.group !== filtered[index - 1]?.group}
				<li role="presentation" class="px-3 pt-3 pb-1 text-caption text-ink-tertiary first:pt-1">
					{option.group}
				</li>
			{/if}
			<li
				id="{uid}-opt-{index}"
				role="option"
				tabindex="-1"
				aria-selected={option.value === value}
				aria-disabled={option.disabled || undefined}
				class={[
					'flex min-h-13 cursor-default items-center gap-3 rounded-[0.875rem] px-3 py-1.5 text-body text-ink select-none',
					index === activeIndex && 'bg-fill',
					option.value === value && 'font-semibold',
					option.disabled && 'opacity-40'
				]}
				onpointermove={() => {
					if (!option.disabled) activeIndex = index;
				}}
				onclick={() => {
					if (performance.now() - openedAt > CLICK_THROUGH_MS) choose(option);
				}}
				onkeydown={onListKeydown}
			>
				{@render leading(option, 40)}
				<span class="min-w-0 flex-1 truncate">{option.label}</span>
				{#if option.value === value}
					<CheckIcon size={18} weight="bold" class="shrink-0 text-accent-text" />
				{/if}
			</li>
		{:else}
			<li role="presentation" class="px-3 py-8 text-center text-subhead text-ink-tertiary">
				{m.select_no_results()}
			</li>
		{/each}
	</ul>
{/snippet}

<div class={['relative flex flex-col gap-1.5', className]}>
	<label id={labelId} for={triggerId} class="px-1 text-footnote font-semibold text-ink-secondary">
		{label}
	</label>
	<button
		{@attach ref<HTMLButtonElement>((node) => (trigger = node))}
		id={triggerId}
		type="button"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={open ? listId : undefined}
		aria-labelledby="{labelId} {triggerId}"
		{disabled}
		class="flex h-13 w-full items-center gap-2.5 rounded-field bg-surface-muted pr-2.5 pl-3 text-left text-callout text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
		onclick={() => (open ? close() : openList())}
		onkeydown={onTriggerKeydown}
	>
		{#if selected}
			{@render leading(selected, 28)}
			<span class="min-w-0 flex-1 truncate">{selected.label}</span>
		{:else}
			<span class="min-w-0 flex-1 truncate pl-1 text-ink-tertiary">{placeholder}</span>
		{/if}
		<CaretUpDownIcon
			size={18}
			weight="bold"
			aria-hidden="true"
			class="shrink-0 text-ink-tertiary"
		/>
	</button>
	{#if name}
		<input type="hidden" {name} {value} />
	{/if}

	{#if open && mode === 'popover'}
		<div
			popover="manual"
			{@attach topLayerPopover}
			transition:materialize={{ y: placement === 'below' ? -6 : 6, duration: 200 }}
			class={[
				// Solid, not glass: a list over busy content has to stay readable
				'fixed inset-auto m-0 flex flex-col overflow-hidden rounded-[1.25rem] border-0 bg-surface p-0 text-ink shadow-xl ring-1 ring-line-strong',
				placement === 'below' ? 'origin-top' : 'origin-bottom'
			]}
			style:left="{box.left}px"
			style:width="{box.width}px"
			style:top={placement === 'below' ? `${box.top}px` : undefined}
			style:bottom={placement === 'above' ? `${box.bottom}px` : undefined}
			style:max-height="{maxHeight}px"
		>
			{@render panel()}
		</div>
	{/if}
</div>

{#if mode === 'sheet'}
	<Sheet bind:open title={label}>
		{@render panel()}
	</Sheet>
{/if}
