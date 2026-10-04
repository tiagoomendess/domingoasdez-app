<script lang="ts">
	type Props = {
		checked: boolean;
		label?: string;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	};

	let { checked = $bindable(), label, disabled = false, onchange }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	class={[
		'inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-(--dur-fast) disabled:opacity-40',
		checked ? 'bg-success' : 'bg-fill-strong'
	]}
	onclick={() => {
		checked = !checked;
		onchange?.(checked);
	}}
>
	<span
		aria-hidden="true"
		class={[
			'size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-[translate] duration-(--dur-base) ease-fluid motion-reduce:transition-none',
			checked ? 'translate-x-5' : 'translate-x-0'
		]}
	></span>
</button>
