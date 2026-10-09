<script lang="ts">
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import { m } from '#lib/messages.ts';

	let {
		showBack = $bindable(),
		showLiveDot = $bindable()
	}: { showBack: boolean; showLiveDot: boolean } = $props();
</script>

<DesignSection
	id="navegacao"
	title="Navigation"
	description="No top bar and no side menu. The floating buttons and tab bar on this page are the real components."
>
	<Specimen label="Floating buttons">
		<ListGroup>
			<ListRow title="Mostrar botão voltar" subtitle="Hidden on the five tab roots">
				{#snippet trailing()}
					<Switch bind:checked={showBack} label="Mostrar botão voltar" />
				{/snippet}
			</ListRow>
			<ListRow title="Tema" subtitle="Top right · follows the system until tapped" />
		</ListGroup>
	</Specimen>

	<Specimen label="Tab bar" note="Tap a tab to see the selection slide">
		<ListGroup
			footer="Below 360px wide the bar switches to short labels, so long words like “Compétitions” still fit five across."
		>
			<ListRow
				title="Mostrar ícone ao vivo"
				subtitle="Pulsing red Games tab when matches are live"
			>
				{#snippet trailing()}
					<Switch bind:checked={showLiveDot} label="Mostrar ícone ao vivo" />
				{/snippet}
			</ListRow>
			<ListRow title={m.nav_home()} value="/" />
			<ListRow title={m.nav_games()} value="/jogos" />
			<ListRow
				title={m.nav_competitions()}
				value="/competicoes"
				subtitle="Short label: {m.nav_competitions_short()}"
			/>
			<ListRow title={m.nav_pages()} value="/p" />
			<ListRow title={m.nav_account()} value="/conta" />
		</ListGroup>
	</Specimen>
</DesignSection>
