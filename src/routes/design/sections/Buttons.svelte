<script lang="ts">
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import ShareNetworkIcon from 'phosphor-svelte/lib/ShareNetworkIcon';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import { pitchPhoto } from '../sample-data.ts';

	let loading = $state(false);
</script>

<DesignSection
	id="botoes"
	title="Buttons"
	description="Capsules. 44px (md) and 52px (lg) tall. Press feedback is instant."
>
	<Specimen label="Variants" class="flex flex-wrap gap-3">
		<Button>Entrar</Button>
		<Button variant="tinted">Criar conta</Button>
		<Button variant="outline">Entrar com o Google</Button>
		<Button variant="plain">Ver tudo</Button>
		<Button variant="destructive">Terminar sessão</Button>
	</Specimen>

	<Specimen label="Sizes and icons" class="flex flex-wrap items-center gap-3">
		<Button size="lg" icon={CheckIcon}>Votar</Button>
		<Button variant="tinted" icon={ShareNetworkIcon}>Partilhar</Button>
	</Specimen>

	<Specimen label="States">
		<div class="flex flex-wrap items-center gap-3">
			<Button {loading} onclick={() => (loading = true)}>Guardar alterações</Button>
			<Button disabled>Indisponível</Button>
		</div>
		<label class="mt-3 flex items-center gap-3 px-1 text-subhead text-ink-secondary">
			<Switch bind:checked={loading} label="Loading" />
			Loading (keeps its width)
		</label>
	</Specimen>

	<Specimen label="Full width" note="Forms, logged-out Account">
		<Button size="lg" full>Entrar</Button>
	</Specimen>

	<Specimen label="Icon buttons" note="glass · fill · plain">
		<div class="relative flex items-center gap-4 overflow-hidden rounded-card p-5">
			<img src={pitchPhoto('night')} alt="" class="absolute inset-0 size-full object-cover" />
			<div class="relative flex flex-1 items-center gap-3">
				<IconButton label="Voltar">
					<CaretLeftIcon size={22} weight="bold" />
				</IconButton>
				<IconButton label="Pesquisar">
					<MagnifyingGlassIcon size={22} weight="bold" />
				</IconButton>
			</div>
			<div class="relative flex items-center gap-3 rounded-full bg-surface p-1.5">
				<IconButton variant="fill" label="Fechar">
					<XIcon size={18} weight="bold" />
				</IconButton>
				<IconButton variant="plain" label="Partilhar">
					<ShareNetworkIcon size={20} />
				</IconButton>
			</div>
		</div>
	</Specimen>
</DesignSection>
