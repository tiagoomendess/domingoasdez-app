<script lang="ts">
	import { untrack } from 'svelte';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import { m } from '#lib/messages.ts';
	import type { GoalFlash, Match } from '#lib/components/types.ts';

	type Props = {
		name: string;
		subtitle?: string;
		emblem?: string | null;
		href?: string;
		matches: Match[];
		onliveclick?: (match: Match) => void;
		/** Goals to highlight, by match id. */
		goals?: Record<number, GoalFlash>;
		/** Start collapsed. Only read on mount; the user's toggle wins after that. */
		collapsed?: boolean;
	};

	let {
		name,
		subtitle,
		emblem,
		href,
		matches,
		onliveclick,
		goals,
		collapsed = false
	}: Props = $props();

	let open = $state(untrack(() => !collapsed));
	let contentHeight = $state(0);
	/** Height stays `auto` until the first frame, so the list does not animate in on load. */
	let motion = $state(false);

	const press =
		'transition-colors hover:bg-fill active:bg-fill-strong focus-visible:bg-fill focus-visible:outline-none';

	function armMotion(_node: HTMLElement) {
		const frame = requestAnimationFrame(() => {
			motion = true;
		});
		return () => cancelAnimationFrame(frame);
	}

	function toggle() {
		open = !open;
	}
</script>

<section class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
	<div class="flex items-stretch">
		<!-- The whole header toggles, so a collapsed group opens where you'd naturally tap -->
		<h3 class="flex min-w-0 flex-1">
			<button
				type="button"
				class={[
					'flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pr-3 pl-4 text-left',
					press
				]}
				aria-expanded={open}
				onclick={toggle}
			>
				<Emblem src={emblem} {name} size={32} shape="rounded" decorative />
				<span class="min-w-0 flex-1">
					<span class="block truncate text-headline text-ink">{name}</span>
					{#if subtitle}
						<span class="block truncate text-footnote text-ink-secondary">{subtitle}</span>
					{/if}
				</span>
				<CaretDownIcon
					size={16}
					weight="bold"
					class={[
						'shrink-0 text-ink-tertiary transition-transform duration-(--dur-base) ease-snappy motion-reduce:transition-none',
						open && '-rotate-180'
					]}
				/>
			</button>
		</h3>
		{#if href}
			<a
				{href}
				class={[
					'flex w-12 shrink-0 items-center justify-center border-l border-line text-ink-tertiary',
					press
				]}
				aria-label={m.games_section_open({ name })}
			>
				<CaretRightIcon size={16} weight="bold" />
			</a>
		{/if}
	</div>
	<div
		class={['panel', motion && 'motion']}
		style:height={motion ? (open ? `${contentHeight}px` : '0px') : 'auto'}
		style:opacity={open ? 1 : 0}
		inert={!open}
		{@attach armMotion}
	>
		<ul bind:clientHeight={contentHeight}>
			{#each matches as match (match.id)}
				<li class="match">
					<MatchRow {match} {onliveclick} goal={goals?.[match.id]} />
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.panel {
		overflow: hidden;
	}

	.panel.motion {
		transition:
			height var(--dur-base) var(--ease-snappy),
			opacity var(--dur-base) var(--ease-snappy);
	}

	@media (prefers-reduced-motion: reduce) {
		.panel.motion {
			transition: opacity var(--dur-fast) var(--ease-snappy);
		}
	}

	.match {
		position: relative;
	}

	.match::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 4.75rem;
		height: 1px;
		background-color: var(--line);
	}
</style>
