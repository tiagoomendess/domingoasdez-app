<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SwipePager } from '#lib/swipe-pager.svelte.ts';
	import RoundNavigator from './RoundNavigator.svelte';

	type Props = {
		label: string;
		hasPrev: boolean;
		hasNext: boolean;
		onprev: () => void;
		onnext: () => void;
		children: Snippet;
	};

	let { label, hasPrev, hasNext, onprev, onnext, children }: Props = $props();

	const pager = new SwipePager({
		canGo: (dir) => (dir === 1 ? hasNext : hasPrev),
		change: (dir) => (dir === 1 ? onnext() : onprev())
	});
</script>

<div {@attach pager.listen}>
	<RoundNavigator
		{label}
		{hasPrev}
		{hasNext}
		onprev={() => pager.go(-1)}
		onnext={() => pager.go(1)}
	/>
	<!-- No transform at rest: the content only moves while a swipe or a round change runs -->
	<div bind:clientWidth={pager.width} style:transform={pager.transform} style:opacity={pager.fade}>
		{@render children()}
	</div>
</div>
