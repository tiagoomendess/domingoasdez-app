<script lang="ts">
	import CalendarXIcon from 'phosphor-svelte/lib/CalendarXIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Skeleton from '#lib/components/ui/Skeleton.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';

	type Props = {
		onopensheet: () => void;
		ontoast: (message: string, tone: 'info' | 'success' | 'error') => void;
	};

	let { onopensheet, ontoast }: Props = $props();
</script>

<DesignSection
	id="estado"
	title="Status and feedback"
	description="Status, completion, warning and error — confirm meaningful actions, show loading in the shape of the content."
>
	<Specimen label="Status pills" class="flex flex-wrap gap-2">
		<StatusPill status="live" />
		<StatusPill status="warmup" label="Aquecimento" />
		<StatusPill status="finished" />
		<StatusPill status="postponed" />
		<StatusPill status="open" label="Termina amanhã" />
		<StatusPill status="closed" />
	</Specimen>

	<Specimen label="Skeletons" note="Shaped like the content">
		<div class="space-y-3">
			<div class="overflow-hidden rounded-card bg-surface ring-1 ring-line dark:ring-0">
				<div class="flex items-center gap-3 px-4 py-3">
					<Skeleton class="size-8" />
					<div class="flex-1 space-y-1.5">
						<Skeleton class="h-4 w-2/3" />
						<Skeleton class="h-3 w-1/3" />
					</div>
				</div>
				{#each [1, 2] as row (row)}
					<div class="flex items-center gap-3 border-t border-line px-4 py-3">
						<Skeleton class="h-4 w-12" />
						<div class="flex-1 space-y-2">
							<Skeleton class="h-4 w-4/5" />
							<Skeleton class="h-4 w-3/5" />
						</div>
					</div>
				{/each}
			</div>
			<div class="rounded-card bg-surface p-2.5 ring-1 ring-line dark:ring-0">
				<Skeleton class="aspect-video w-full rounded-inner" />
				<div class="space-y-2 px-1.5 pt-3 pb-1.5">
					<Skeleton class="h-5 w-11/12" />
					<Skeleton class="h-5 w-2/3" />
					<Skeleton class="h-3 w-1/4" />
				</div>
			</div>
		</div>
	</Specimen>

	<Specimen label="Empty state" note="Offers the legacy “closest game”">
		<div class="rounded-card bg-surface ring-1 ring-line dark:ring-0">
			<EmptyState
				icon={CalendarXIcon}
				title="Sem jogos neste dia"
				description="O jogo mais próximo está marcado para 12 de outubro."
			>
				{#snippet action()}
					<Button variant="tinted">Ir para 12 out</Button>
				{/snippet}
			</EmptyState>
		</div>
	</Specimen>

	<Specimen label="Sheet and toast" note="Drag the sheet down to dismiss (phones)">
		<div class="flex flex-wrap gap-3">
			<Button variant="tinted" onclick={onopensheet}>Abrir sheet</Button>
			<Button variant="tinted" onclick={() => ontoast('Voto registado', 'success')}>
				Toast de sucesso
			</Button>
			<Button variant="tinted" onclick={() => ontoast('Não foi possível guardar', 'error')}>
				Toast de erro
			</Button>
		</div>
	</Specimen>
</DesignSection>
