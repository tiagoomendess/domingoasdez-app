<script lang="ts">
	import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon';
	import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
	import VideoCameraIcon from 'phosphor-svelte/lib/VideoCameraIcon';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import MicrophoneIcon from 'phosphor-svelte/lib/MicrophoneIcon';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import ChipGroup from '#lib/components/ui/ChipGroup.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { setThemePreference, type ThemePreference } from '#lib/theme.ts';

	let { appearance = $bindable() }: { appearance: ThemePreference } = $props();

	const feedTypes = [
		{ value: 'articles', label: 'Artigos', icon: NewspaperIcon },
		{ value: 'polls', label: 'Sondagens', icon: ChartBarHorizontalIcon },
		{ value: 'videos', label: 'Vídeos', icon: VideoCameraIcon },
		{ value: 'transfers', label: 'Transferências', icon: ArrowsLeftRightIcon },
		{ value: 'interviews', label: 'Entrevistas', icon: MicrophoneIcon },
		{ value: 'results', label: 'Resultados', icon: TrophyIcon }
	] as const;

	type FeedType = (typeof feedTypes)[number]['value'];

	let selectedTypes = $state<FeedType[]>(['articles', 'polls']);
	let view = $state<'table' | 'games' | 'stats'>('table');
	let goals = $state(true);
	let email = $state('');
	let password = $state('1234');

	const selectedLabels = $derived(
		feedTypes.filter((type) => selectedTypes.includes(type.value)).map((type) => type.label)
	);
</script>

<DesignSection
	id="selecao"
	title="Selection and input"
	description="Chips filter, segmented controls switch peer views, switches toggle settings."
>
	<Specimen label="Filter chips" note="One row, swipe sideways, min. 1">
		<ChipGroup label="Mostrar no feed" options={[...feedTypes]} bind:value={selectedTypes} />
		<p class="mt-2 px-1 text-footnote text-ink-tertiary">
			Showing: {selectedLabels.join(', ')}. Try deselecting the last one.
		</p>
	</Specimen>

	<Specimen label="Segmented control" note="Second-level views">
		<SegmentedControl
			label="Vista da competição"
			options={[
				{ value: 'table', label: 'Classificação' },
				{ value: 'games', label: 'Jogos' },
				{ value: 'stats', label: 'Estatísticas' }
			]}
			bind:value={view}
		/>
	</Specimen>

	<Specimen label="Appearance" note="Wired to the real theme">
		<SegmentedControl
			label="Aparência"
			options={[
				{ value: 'system', label: 'Automático' },
				{ value: 'light', label: 'Claro' },
				{ value: 'dark', label: 'Escuro' }
			]}
			bind:value={appearance}
			onchange={setThemePreference}
		/>
	</Specimen>

	<Specimen label="Switch" class="flex items-center gap-4">
		<Switch bind:checked={goals} label="Notificações de golos" />
		<Switch checked={false} label="Desligado" />
		<Switch checked disabled label="Indisponível" />
	</Specimen>

	<Specimen label="Text fields" note="Label above, inline validation">
		<div class="space-y-4 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
			<TextField
				label="Email"
				type="email"
				autocomplete="email"
				placeholder="nome@exemplo.pt"
				helper="Usamos o email apenas para entrares na tua conta."
				bind:value={email}
			/>
			<TextField
				label="Palavra-passe"
				type="password"
				autocomplete="current-password"
				error="A palavra-passe tem de ter pelo menos 8 caracteres."
				bind:value={password}
			/>
			<TextField label="Nome de utilizador" value="tiago" disabled />
		</div>
	</Specimen>
</DesignSection>
