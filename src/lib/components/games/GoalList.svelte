<script lang="ts">
	import ListGroup from '#lib/components/ui/ListGroup.svelte';
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import { m } from '#lib/messages.ts';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';

	type Goal = {
		id: number;
		minute: number | null;
		ownGoal: boolean;
		penalty: boolean;
		playerName: string;
		picture: string;
		href: string | null;
	};

	type Props = {
		title: string;
		goals: Goal[];
		addGoalHref?: string | null;
		addGoalLabel?: string | null;
	};

	let { title, goals, addGoalHref = null, addGoalLabel = null }: Props = $props();

	function playerName(name: string): string {
		return name === '__unknown__' ? m.game_unknown_player() : name;
	}

	function subtitle(goal: Goal): string | undefined {
		const parts: string[] = [];
		if (goal.ownGoal) parts.push(m.game_own_goal());
		if (goal.penalty) parts.push(m.game_penalty_goal());
		return parts.length > 0 ? parts.join(' · ') : undefined;
	}

	function minuteLabel(minute: number | null): string {
		if (minute == null) return '';
		return `${minute}'`;
	}
</script>

<ListGroup {title} headingLevel={3}>
	{#if goals.length === 0}
		<li class="px-4 py-5 text-center text-callout text-ink-secondary">{m.game_no_goals()}</li>
	{:else}
		{#each goals as goal (goal.id)}
			{@const name = playerName(goal.playerName)}
			<ListRow
				title={name}
				subtitle={subtitle(goal)}
				value={minuteLabel(goal.minute)}
				href={goal.href ?? undefined}
			>
				{#snippet leading()}
					<Avatar {name} src={goal.picture} size={40} />
				{/snippet}
			</ListRow>
		{/each}
	{/if}

	{#if addGoalHref && addGoalLabel}
		<ListRow title={addGoalLabel} href={addGoalHref} chevron>
			{#snippet leading()}
				<span
					class="inline-grid size-10 place-items-center rounded-full bg-accent-tint text-accent-text"
				>
					<PlusIcon size={20} weight="bold" />
				</span>
			{/snippet}
		</ListRow>
	{/if}
</ListGroup>
