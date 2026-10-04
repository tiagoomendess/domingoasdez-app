<script lang="ts">
	import SunIcon from 'phosphor-svelte/lib/SunIcon';
	import MoonIcon from 'phosphor-svelte/lib/MoonIcon';
	import { invalidate } from '$app/navigation';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { toggleTheme, type ThemePreference } from '#lib/theme.ts';
	import { m } from '#lib/messages.ts';

	type Props = {
		ontoggle?: (preference: ThemePreference) => void;
		class?: string;
	};

	let { ontoggle, class: className }: Props = $props();

	const iconClasses =
		'col-start-1 row-start-1 transition-[opacity,scale,rotate] duration-(--dur-base) ease-fluid motion-reduce:transition-none';
</script>

<!-- Both icons are rendered and swapped with CSS, so the server never guesses the theme -->
<IconButton
	variant="glass"
	label={m.theme_toggle()}
	class={className}
	onclick={() => {
		const next = toggleTheme();
		void invalidate('app:preferences');
		ontoggle?.(next);
	}}
>
	<span class="grid">
		<MoonIcon
			size={22}
			weight="bold"
			class={[iconClasses, 'dark:scale-50 dark:-rotate-90 dark:opacity-0']}
		/>
		<SunIcon
			size={22}
			weight="bold"
			class={[
				iconClasses,
				'scale-50 rotate-90 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100'
			]}
		/>
	</span>
</IconButton>
