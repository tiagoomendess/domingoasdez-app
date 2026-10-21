<script lang="ts">
	import MinusIcon from 'phosphor-svelte/lib/MinusIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { PREDICTION_MAX_GOALS } from '#lib/predictions.ts';
	import { m } from '#lib/messages.ts';
	import { countIn, countOut } from '#lib/motion.ts';

	type Props = {
		name: string;
		emblem: string | null;
		value: number;
		/** Submitted under this name through a hidden input. */
		inputName: string;
	};

	let { name, emblem, value = $bindable(0), inputName }: Props = $props();

	const uid = $props.id();

	// Which way the digit rolls: up when it grows. Plain variable, not state.
	let previous: number | null = null;
	const direction = $derived.by(() => {
		const goingDown = previous != null && value < previous;
		previous = value;
		return goingDown ? -1 : 1;
	});

	function set(next: number) {
		value = Math.min(PREDICTION_MAX_GOALS, Math.max(0, next));
	}

	/** Spin-button keys: arrows step, Home/End jump, Page keys move by 5. */
	function onkeydown(event: KeyboardEvent) {
		const step: Record<string, number> = {
			ArrowUp: 1,
			ArrowRight: 1,
			ArrowDown: -1,
			ArrowLeft: -1,
			PageUp: 5,
			PageDown: -5
		};
		if (event.key in step) set(value + step[event.key]);
		else if (event.key === 'Home') set(0);
		else if (event.key === 'End') set(PREDICTION_MAX_GOALS);
		else return;
		event.preventDefault();
	}
</script>

<div class="flex min-h-14 items-center gap-3">
	<Emblem src={emblem} {name} size={32} plate={false} decorative />
	<span id="{uid}-name" class="min-w-0 flex-1 truncate text-headline text-ink">{name}</span>

	<div class="flex shrink-0 items-center gap-1">
		<IconButton
			variant="fill"
			label={m.game_prediction_fewer({ team: name })}
			disabled={value <= 0}
			onclick={() => set(value - 1)}
		>
			<MinusIcon size={20} weight="bold" />
		</IconButton>

		<!-- Not an <input>: the global 16px floor on fields would shrink the digit to body size. -->
		<span
			role="spinbutton"
			tabindex="0"
			aria-labelledby="{uid}-name"
			aria-valuemin={0}
			aria-valuemax={PREDICTION_MAX_GOALS}
			aria-valuenow={value}
			{onkeydown}
			class="grid w-10 cursor-default justify-items-center overflow-hidden rounded-inner text-title-2 text-ink tabular-nums outline-offset-2 select-none"
		>
			{#key value}
				<span
					class="col-start-1 row-start-1"
					in:countIn={{ direction }}
					out:countOut={{ direction }}>{value}</span
				>
			{/key}
		</span>

		<IconButton
			variant="fill"
			label={m.game_prediction_more({ team: name })}
			disabled={value >= PREDICTION_MAX_GOALS}
			onclick={() => set(value + 1)}
		>
			<PlusIcon size={20} weight="bold" />
		</IconButton>
	</div>

	<input type="hidden" name={inputName} {value} />
</div>
