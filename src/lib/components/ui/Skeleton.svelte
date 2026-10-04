<script lang="ts">
	let { class: className }: { class?: string } = $props();
</script>

<div
	aria-hidden="true"
	class={['animate-pulse rounded-badge bg-fill-strong motion-reduce:animate-none', className]}
></div>
