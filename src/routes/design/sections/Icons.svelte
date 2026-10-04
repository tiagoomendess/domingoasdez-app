<script lang="ts">
	import HouseIcon from 'phosphor-svelte/lib/HouseIcon';
	import SoccerBallIcon from 'phosphor-svelte/lib/SoccerBallIcon';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import FilesIcon from 'phosphor-svelte/lib/FilesIcon';
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import SunIcon from 'phosphor-svelte/lib/SunIcon';
	import MoonIcon from 'phosphor-svelte/lib/MoonIcon';
	import CalendarBlankIcon from 'phosphor-svelte/lib/CalendarBlankIcon';
	import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon';
	import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
	import BellIcon from 'phosphor-svelte/lib/BellIcon';
	import ShareNetworkIcon from 'phosphor-svelte/lib/ShareNetworkIcon';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import DesignSection from '../DesignSection.svelte';
	import Specimen from '../Specimen.svelte';
	import type { Icon } from '#lib/components/types.ts';

	const tabIcons: [string, Icon][] = [
		['House', HouseIcon],
		['SoccerBall', SoccerBallIcon],
		['Trophy', TrophyIcon],
		['Files', FilesIcon],
		['UserCircle', UserCircleIcon]
	];

	const uiIcons: [string, Icon][] = [
		['CaretLeft', CaretLeftIcon],
		['CaretRight', CaretRightIcon],
		['Sun', SunIcon],
		['Moon', MoonIcon],
		['CalendarBlank', CalendarBlankIcon],
		['Newspaper', NewspaperIcon],
		['ChartBarHorizontal', ChartBarHorizontalIcon],
		['Bell', BellIcon],
		['ShareNetwork', ShareNetworkIcon],
		['MagnifyingGlass', MagnifyingGlassIcon],
		['X', XIcon]
	];
</script>

<DesignSection
	id="icones"
	title="Icons"
	description="Phosphor. Outline when inactive, filled when active — like iOS tab bars. Chrome glyphs use the bold weight so they read on glass."
>
	<Specimen label="Tab bar" note="regular → fill">
		<div class="grid grid-cols-5 gap-2 rounded-card bg-surface p-3 ring-1 ring-line dark:ring-0">
			{#each tabIcons as [name, TabIcon] (name)}
				<div class="flex flex-col items-center gap-2 py-2">
					<div class="flex gap-1.5">
						<TabIcon size={24} class="text-ink-secondary" />
						<TabIcon size={24} weight="fill" class="text-accent-text" />
					</div>
					<span class="w-full truncate text-center text-caption font-normal text-ink-tertiary"
						>{name}</span
					>
				</div>
			{/each}
		</div>
	</Specimen>

	<Specimen label="Interface" note="24 chrome · 20 inline · 16 in pills">
		<div
			class="grid grid-cols-4 gap-2 rounded-card bg-surface p-3 ring-1 ring-line sm:grid-cols-6 dark:ring-0"
		>
			{#each uiIcons as [name, UiIcon] (name)}
				<div class="flex flex-col items-center gap-2 py-2">
					<UiIcon size={24} class="text-ink" />
					<span class="w-full truncate text-center text-caption font-normal text-ink-tertiary"
						>{name}</span
					>
				</div>
			{/each}
		</div>
	</Specimen>
</DesignSection>
