<script lang="ts">
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { m } from '#lib/messages.ts';

	type SeasonOption = {
		id: number;
		label: string;
		href: string;
	};

	type Props = {
		open: boolean;
		seasons: SeasonOption[];
		currentId: number;
	};

	let { open = $bindable(false), seasons, currentId }: Props = $props();
</script>

<Sheet bind:open title={m.competition_season_picker()}>
	<ul class="divide-y divide-line">
		{#each seasons as season (season.id)}
			<li>
				<a
					href={season.href}
					class={[
						'flex min-h-12 items-center px-1 text-body transition-colors hover:bg-fill active:bg-fill-strong',
						season.id === currentId ? 'font-semibold text-accent-text' : 'text-ink'
					]}
					aria-current={season.id === currentId ? 'page' : undefined}
					onclick={() => (open = false)}
				>
					{season.label}
				</a>
			</li>
		{/each}
	</ul>
</Sheet>
