<script lang="ts">
	import { onMount } from 'svelte';
	import CalendarCheckIcon from 'phosphor-svelte/lib/CalendarCheckIcon';
	import BackButton from '#lib/components/shell/BackButton.svelte';
	import TabBar from '#lib/components/shell/TabBar.svelte';
	import ThemeToggle from '#lib/components/shell/ThemeToggle.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import Toast from '#lib/components/ui/Toast.svelte';
	import { getThemePreference, type ThemePreference } from '#lib/theme.ts';
	import { getTabs } from '#lib/navigation.svelte.ts';
	import Colors from './sections/Colors.svelte';
	import Typography from './sections/Typography.svelte';
	import ShapeAndMaterials from './sections/ShapeAndMaterials.svelte';
	import Motion from './sections/Motion.svelte';
	import Icons from './sections/Icons.svelte';
	import Buttons from './sections/Buttons.svelte';
	import Selection from './sections/Selection.svelte';
	import Lists from './sections/Lists.svelte';
	import Feedback from './sections/Feedback.svelte';
	import Games from './sections/Games.svelte';
	import Feed from './sections/Feed.svelte';
	import Navigation from './sections/Navigation.svelte';

	const index = [
		{ id: 'cor', label: 'Colour' },
		{ id: 'tipografia', label: 'Typography' },
		{ id: 'forma', label: 'Shape' },
		{ id: 'movimento', label: 'Motion' },
		{ id: 'icones', label: 'Icons' },
		{ id: 'botoes', label: 'Buttons' },
		{ id: 'selecao', label: 'Selection' },
		{ id: 'listas', label: 'Lists' },
		{ id: 'estado', label: 'Feedback' },
		{ id: 'jogos', label: 'Games' },
		{ id: 'feed', label: 'Feed' },
		{ id: 'navegacao', label: 'Navigation' }
	];

	const tabs = getTabs();

	let currentTab = $state('home');
	let showBack = $state(true);
	let appearance = $state<ThemePreference>('system');
	let sheetOpen = $state(false);
	let toast = $state({ visible: false, message: '', tone: 'info' as 'info' | 'success' | 'error' });

	onMount(() => {
		appearance = getThemePreference();
	});

	function showToast(message: string, tone: 'info' | 'success' | 'error' = 'info') {
		toast = { visible: true, message, tone };
	}
</script>

<svelte:head>
	<title>Design system · Domingo às Dez</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div aria-hidden="true" class="scroll-edge-top z-30"></div>
<div aria-hidden="true" class="scroll-edge-bottom z-30"></div>

<BackButton
	fallback="/"
	visible={showBack}
	class="fixed top-(--chrome-top) left-(--chrome-inset) z-40"
/>
<ThemeToggle
	class="fixed top-(--chrome-top) right-(--chrome-inset) z-40"
	ontoggle={(preference) => (appearance = preference)}
/>

<main class="page-container space-y-16">
	<header class="px-1">
		<p class="text-footnote font-semibold text-accent-text">Domingo às Dez</p>
		<h1 class="text-large-title text-ink">Design system</h1>
		<p class="mt-2 text-callout text-ink-secondary">
			Tokens and components for the new public app. Modern, minimal and mobile first, based on
			Liquid Glass. Everything here is the real component, in both themes.
		</p>
		<nav aria-label="Secções" class="-mx-5 mt-5 rail px-4 py-1">
			{#each index as item (item.id)}
				<a
					href="#{item.id}"
					class="inline-flex h-9 shrink-0 pressable snap-start items-center rounded-full bg-fill px-4 text-subhead font-medium whitespace-nowrap text-ink hover:bg-fill-strong"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>

	<Colors />
	<Typography />
	<ShapeAndMaterials />
	<Motion />
	<Icons />
	<Buttons />
	<Selection bind:appearance />
	<Lists ontoast={(message) => showToast(message, 'success')} />
	<Feedback onopensheet={() => (sheetOpen = true)} ontoast={showToast} />
	<Games oncalendar={() => (sheetOpen = true)} />
	<Feed />
	<Navigation bind:showBack />
</main>

<TabBar
	{tabs}
	current={currentTab}
	onselect={(id, event) => {
		event.preventDefault();
		currentTab = id;
	}}
/>

<Sheet bind:open={sheetOpen} title="Escolher data">
	<ListGroup>
		{#each ['Hoje', 'Amanhã', 'Este fim de semana', 'Próxima semana'] as option (option)}
			<ListRow
				title={option}
				onclick={() => {
					sheetOpen = false;
					showToast(option);
				}}
			>
				{#snippet leading()}
					<CalendarCheckIcon size={22} class="text-accent-text" />
				{/snippet}
			</ListRow>
		{/each}
	</ListGroup>
	<p class="mt-3 px-1 text-footnote text-ink-tertiary">
		The full month picker will live here. On phones this is a bottom sheet you can drag down to
		dismiss; from 768px wide it becomes a centred dialog.
	</p>
</Sheet>

<Toast bind:visible={toast.visible} message={toast.message} tone={toast.tone} />
