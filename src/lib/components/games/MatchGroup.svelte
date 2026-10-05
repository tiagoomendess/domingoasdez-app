<script lang="ts">
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import MatchRow from '#lib/components/games/MatchRow.svelte';
	import { m } from '#lib/messages.ts';
	import type { Match } from '#lib/components/types.ts';

	type Props = {
		name: string;
		subtitle?: string;
		emblem?: string | null;
		href?: string;
		matches: Match[];
		onliveclick?: (match: Match) => void;
	};

	let { name, subtitle, emblem, href, matches, onliveclick }: Props = $props();

	let open = $state(true);
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

{#snippet identity()}
	<Emblem src={emblem} {name} size={32} shape="rounded" decorative />
	<span class="min-w-0 flex-1">
		<h3 class="truncate text-headline text-ink">{name}</h3>
		{#if subtitle}
			<p class="truncate text-footnote text-ink-secondary">{subtitle}</p>
		{/if}
	</span>
{/snippet}

<section class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
	<div class="flex items-stretch">
		{#if href}
			<a {href} class={['flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-4', press]}>
				{@render identity()}
			</a>
		{:else}
			<div class={['flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-4', press]}>
				{@render identity()}
			</div>
		{/if}
		<button
			type="button"
			class={['flex w-12 shrink-0 cursor-pointer items-center justify-center border-l border-line', press]}
			aria-expanded={open}
			aria-label={open ? m.games_section_collapse({ name }) : m.games_section_expand({ name })}
			onclick={toggle}
		>
			<CaretDownIcon
				size={16}
				weight="bold"
				class={[
					'text-ink-tertiary transition-transform duration-(--dur-base) ease-snappy motion-reduce:transition-none',
					open && '-rotate-180'
				]}
			/>
		</button>
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
					<MatchRow {match} {onliveclick} />
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
