<script lang="ts">
	import { m } from '#lib/messages.ts';

	type Status = 'live' | 'warmup' | 'finished' | 'postponed' | 'open' | 'closed';

	let { status, label }: { status: Status; label?: string } = $props();

	const styles: Record<Status, { classes: string; label: () => string }> = {
		live: { classes: 'bg-live-tint text-live', label: m.status_live },
		warmup: { classes: 'bg-warmup/12 text-warmup', label: m.status_warmup },
		finished: { classes: 'bg-fill text-ink-secondary', label: m.status_finished },
		postponed: { classes: 'bg-warning/14 text-warning', label: m.status_postponed },
		open: { classes: 'bg-accent-tint text-accent-text', label: m.status_open },
		closed: { classes: 'bg-fill text-ink-secondary', label: m.status_closed }
	};

	const style = $derived(styles[status]);
</script>

<span
	class={[
		'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold whitespace-nowrap',
		style.classes
	]}
>
	{#if status === 'live' || status === 'warmup'}
		<span
			aria-hidden="true"
			class={[
				'size-1.5 rounded-full bg-current',
				status === 'live' && 'animate-live-pulse motion-reduce:animate-none'
			]}
		></span>
	{/if}
	{label ?? style.label()}
</span>
