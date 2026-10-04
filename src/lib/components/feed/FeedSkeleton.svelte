<script lang="ts">
	import Skeleton from '#lib/components/ui/Skeleton.svelte';

	type Props = {
		count?: number;
	};

	let { count = 3 }: Props = $props();
</script>

<div class="space-y-3" aria-hidden="true">
	{#each Array.from({ length: count }, (_, i) => i) as i (i)}
		<div class="rounded-card bg-surface p-2.5 ring-1 ring-line dark:ring-0">
			{#if i % 2 === 0}
				<Skeleton class="aspect-video w-full rounded-inner" />
			{/if}
			<div class="space-y-2 px-1.5 pt-3 pb-1.5">
				<Skeleton class="h-5 w-4/5" />
				<Skeleton class="h-5 w-3/5" />
				<Skeleton class="mt-1 h-4 w-full" />
				<Skeleton class="h-3 w-1/3" />
			</div>
		</div>
	{/each}
</div>
