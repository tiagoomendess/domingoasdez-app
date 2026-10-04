<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type Props = Omit<HTMLTextareaAttributes, 'class' | 'value'> & {
		label: string;
		value?: string;
		helper?: string;
		error?: string;
		class?: string;
	};

	let {
		label,
		value = $bindable(''),
		helper,
		error,
		id,
		rows = 4,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `${uid}-input`);
	const hint = $derived(error ?? helper);
</script>

<div class={['flex flex-col gap-1.5', className]}>
	<label for={inputId} class="px-1 text-footnote font-semibold text-ink-secondary">{label}</label>
	<textarea
		id={inputId}
		{rows}
		bind:value
		aria-invalid={error ? true : undefined}
		aria-describedby={hint ? `${uid}-hint` : undefined}
		class={[
			'min-h-13 rounded-field border-0 bg-surface-muted px-4 py-3 text-body text-ink placeholder:text-ink-tertiary',
			'focus:ring-2 focus:ring-accent focus:ring-offset-0 focus:outline-none',
			error && 'ring-2 ring-danger focus:ring-danger'
		]}
		{...rest}
	></textarea>
	{#if hint}
		<p id="{uid}-hint" class={['px-1 text-footnote', error ? 'text-danger' : 'text-ink-tertiary']}>
			{hint}
		</p>
	{/if}
</div>
