<script lang="ts" module>
	import type { Icon } from '#lib/components/types.ts';

	export type Tab = {
		id: string;
		href: string;
		label: string;
		/** Used below 360px wide, where long labels (e.g. "Compétitions") don't fit five across */
		shortLabel?: string;
		icon: Icon;
		/** When set (logged-in account tab), replaces the icon with a profile photo */
		avatar?: { name: string; src?: string | null };
	};
</script>

<script lang="ts">
	import { page } from '$app/state';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import { m } from '#lib/messages.ts';

	type Props = {
		tabs: Tab[];
		/** The tab the user last tapped; it stays active while they go deeper into it */
		current: string;
		onselect?: (id: string, event: MouseEvent) => void;
		/** When true, Games tab (icon + label) pulses in live red and the link gets a richer accessible name */
		live?: boolean;
	};

	let { tabs, current, onselect, live = false }: Props = $props();

	const index = $derived(tabs.findIndex((tab) => tab.id === current));

	function select(tab: Tab, event: MouseEvent) {
		onselect?.(tab.id, event);
		if (event.defaultPrevented) return;

		if (tab.id === current && page.url.pathname === tab.href) {
			event.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}
</script>

<nav
	aria-label={m.nav_label()}
	class="fixed inset-x-0 bottom-[calc(var(--safe-bottom)+var(--chrome-inset))] z-40 mx-auto w-[min(100%-1.5rem,30rem)] rounded-full glass p-1 lg:w-fit"
	style:--glass-bg="var(--glass-bg-thin)"
>
	<div class="relative">
		{#if index >= 0}
			<span
				aria-hidden="true"
				class="absolute inset-y-0 left-0 rounded-full bg-accent-tint transition-[translate] duration-(--dur-slow) ease-fluid motion-reduce:transition-none"
				style:width="{100 / tabs.length}%"
				style:translate="{index * 100}% 0"
			></span>
		{/if}
		<ul class="relative grid h-14 auto-cols-fr grid-flow-col">
			{#each tabs as tab (tab.id)}
				{@const active = tab.id === current}
				<li class="min-w-0">
					<a
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						aria-label={live && tab.id === 'games' ? m.nav_games_live() : undefined}
						class={[
							'flex h-full pressable flex-col items-center justify-center gap-0.5 rounded-full px-1 lg:flex-row lg:gap-2 lg:px-5',
							live && tab.id === 'games'
								? 'text-live animate-live-pulse motion-reduce:animate-none'
								: active
									? 'text-accent-text'
									: 'text-ink-secondary hover:text-ink'
						]}
						onclick={(event) => select(tab, event)}
					>
						{#if tab.avatar}
							<span class="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
								<Avatar name={tab.avatar.name} src={tab.avatar.src} size={24} />
							</span>
						{:else}
							<tab.icon size={24} weight={active ? 'fill' : 'regular'} class="shrink-0" />
						{/if}
						<span
							class={[
								'truncate text-tab lg:text-footnote lg:font-semibold',
								tab.shortLabel && 'max-[22.5rem]:hidden'
							]}
						>
							{tab.label}
						</span>
						{#if tab.shortLabel}
							<span class="hidden truncate text-tab max-[22.5rem]:inline">{tab.shortLabel}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</nav>
