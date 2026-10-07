<script lang="ts">
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import ChoiceSheet from '#lib/components/account/ChoiceSheet.svelte';
	import { m, getLocale } from '#lib/messages.ts';
	import { setAppearance, setBackButton, setThemeButton } from '#lib/preferences.client.ts';
	import type { ThemePreference } from '#lib/theme.ts';
	import { setLocale, locales, type Locale } from '#lib/paraglide/runtime.js';

	type Props = {
		theme: ThemePreference;
		backButton: boolean;
		themeButton: boolean;
	};

	let { theme, backButton, themeButton }: Props = $props();

	let appearanceOpen = $state(false);
	let languageOpen = $state(false);

	const locale = $derived(getLocale() as Locale);

	const appearanceOptions = $derived([
		{ value: 'system' as const, label: m.prefs_appearance_system() },
		{ value: 'light' as const, label: m.prefs_appearance_light() },
		{ value: 'dark' as const, label: m.prefs_appearance_dark() }
	]);

	const appearanceLabel = $derived(
		appearanceOptions.find((option) => option.value === theme)?.label ?? m.prefs_appearance_system()
	);

	/** Each language name is written in that language and never translated. */
	const LANGUAGE_NAMES: Record<Locale, string> = {
		'pt-PT': 'Português',
		en: 'English',
		fr: 'Français'
	};

	const languageOptions = locales.map((value) => ({
		value,
		label: LANGUAGE_NAMES[value]
	}));

	const languageLabel = $derived(LANGUAGE_NAMES[locale]);

	async function onAppearance(value: ThemePreference) {
		await setAppearance(value);
	}

	function onLanguage(value: Locale) {
		if (value === locale) return;
		setLocale(value);
	}

	async function onBackButton(checked: boolean) {
		await setBackButton(checked);
	}

	async function onThemeButton(checked: boolean) {
		await setThemeButton(checked);
	}
</script>

<ListGroup
	title={m.prefs_group()}
	footer={`${m.prefs_back_button_footer()} ${m.prefs_theme_button_footer()}`}
	headingLevel={2}
>
	<ListRow
		title={m.prefs_appearance()}
		value={appearanceLabel}
		chevron
		onclick={() => (appearanceOpen = true)}
	/>
	<ListRow
		title={m.prefs_language()}
		value={languageLabel}
		chevron
		onclick={() => (languageOpen = true)}
	/>
	<ListRow title={m.prefs_back_button()}>
		{#snippet trailing()}
			<Switch checked={backButton} label={m.prefs_back_button()} onchange={onBackButton} />
		{/snippet}
	</ListRow>
	<ListRow title={m.prefs_theme_button()}>
		{#snippet trailing()}
			<Switch checked={themeButton} label={m.prefs_theme_button()} onchange={onThemeButton} />
		{/snippet}
	</ListRow>
</ListGroup>

<ChoiceSheet
	bind:open={appearanceOpen}
	title={m.prefs_appearance()}
	options={appearanceOptions}
	value={theme}
	onchange={onAppearance}
/>

<ChoiceSheet
	bind:open={languageOpen}
	title={m.prefs_language()}
	options={languageOptions}
	value={locale}
	onchange={onLanguage}
/>
