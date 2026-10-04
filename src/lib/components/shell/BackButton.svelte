<script lang="ts" module>
	// How many entries back the in-app history goes; survives the button remounting between pages
	let depth = 0;
</script>

<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { materialize } from '#lib/motion.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		/** Parent route, used when there is no in-app page to go back to (e.g. a shared link) */
		fallback: string;
		visible?: boolean;
		class?: string;
	};

	let { fallback, visible = true, class: className }: Props = $props();

	afterNavigate((navigation) => {
		if (navigation.type === 'enter') depth = 0;
		else if (navigation.type === 'popstate') depth = Math.max(0, depth + (navigation.delta ?? -1));
		else depth += 1;
	});

	function onclick(event: MouseEvent) {
		if (depth === 0) return;
		event.preventDefault();
		history.back();
	}
</script>

{#if visible}
	<div transition:materialize class={className}>
		<IconButton variant="glass" href={fallback} label={m.action_back()} {onclick}>
			<CaretLeftIcon size={22} weight="bold" />
		</IconButton>
	</div>
{/if}
