<script lang="ts">
	import PaletteIcon from 'phosphor-svelte/lib/PaletteIcon';
	import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon';
	import BellIcon from 'phosphor-svelte/lib/BellIcon';
	import LockIcon from 'phosphor-svelte/lib/LockIcon';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import type { Icon } from '#lib/components/types.ts';
	import { competitions } from '../sample-data.ts';

	let { ontoast }: { ontoast: (message: string) => void } = $props();

	let notifications = $state(true);
</script>

{#snippet tile(TileIcon: Icon, color: string)}
	<span class={['grid size-8 place-items-center rounded-badge text-white', color]}>
		<TileIcon size={18} weight="fill" />
	</span>
{/snippet}

<DesignSection
	id="listas"
	title="Lists"
	description="Inset grouped lists, iOS Settings style. Separators start after the leading slot."
>
	<Specimen label="Competitions" note="Priority order, logo on the left">
		<ListGroup>
			{#each competitions as competition (competition.id)}
				<ListRow title={competition.name} subtitle={competition.season} href="#listas">
					{#snippet leading()}
						<Emblem
							src={competition.emblem}
							name={competition.name}
							size={40}
							shape="rounded"
							decorative
						/>
					{/snippet}
				</ListRow>
			{/each}
		</ListGroup>
	</Specimen>

	<Specimen label="Account" note="Each row pushes a focused page">
		<div class="space-y-6">
			<div class="flex items-center gap-4 rounded-card bg-surface p-4 ring-1 ring-line dark:ring-0">
				<Avatar name="Tiago Silva" size={72} />
				<div class="min-w-0 flex-1">
					<p class="truncate text-title-3 text-ink">Tiago Silva</p>
					<p class="truncate text-subhead text-ink-secondary">tiago@exemplo.pt</p>
					<Button variant="plain" class="-ml-5">Editar foto</Button>
				</div>
			</div>

			<ListGroup title="Preferências" headingLevel={4}>
				<ListRow title="Aparência" value="Automático" href="#listas">
					{#snippet leading()}{@render tile(PaletteIcon, 'bg-brand-600')}{/snippet}
				</ListRow>
				<ListRow title="Idioma" value="Português" href="#listas">
					{#snippet leading()}{@render tile(GlobeIcon, 'bg-pitch-500')}{/snippet}
				</ListRow>
				<ListRow title="Notificações de golos" subtitle="Dos clubes que segues">
					{#snippet leading()}{@render tile(BellIcon, 'bg-gold-500')}{/snippet}
					{#snippet trailing()}
						<Switch bind:checked={notifications} label="Notificações de golos" />
					{/snippet}
				</ListRow>
			</ListGroup>

			<ListGroup
				title="Conta e privacidade"
				headingLevel={4}
				footer="O pedido de eliminação tem de ser confirmado por email."
			>
				<ListRow title="Alterar palavra-passe" href="#listas">
					{#snippet leading()}{@render tile(LockIcon, 'bg-brand-800')}{/snippet}
				</ListRow>
				<ListRow title="Descarregar os meus dados" href="#listas">
					{#snippet leading()}{@render tile(DownloadSimpleIcon, 'bg-brand-500')}{/snippet}
				</ListRow>
				<ListRow title="Eliminar conta" destructive href="#listas">
					{#snippet leading()}{@render tile(TrashIcon, 'bg-danger')}{/snippet}
				</ListRow>
			</ListGroup>

			<ListGroup>
				<ListRow title="Terminar sessão" destructive onclick={() => ontoast('Sessão terminada')} />
			</ListGroup>
		</div>
	</Specimen>
</DesignSection>
