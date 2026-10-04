<script lang="ts">
	import Emblem from '#lib/components/ui/Emblem.svelte';
	import { m } from '#lib/messages.ts';
	import type { RowZone, StandingRow } from '#lib/standings.ts';

	type Props = {
		rows: StandingRow[];
		zones: RowZone[];
	};

	let { rows, zones }: Props = $props();
</script>

<div class="overflow-x-auto">
	<table class="w-full min-w-0 border-collapse text-footnote tabular-nums">
		<thead>
			<tr class="text-left text-ink-tertiary">
				<th class="w-8 py-2 pr-1 pl-3 font-semibold" scope="col">{m.table_position()}</th>
				<th class="w-8 py-2 pr-1 font-semibold" scope="col">
					<span class="sr-only">{m.table_club()}</span>
				</th>
				<th class="py-2 pr-2 font-semibold" scope="col">{m.table_club()}</th>
				<th class="hidden py-2 px-1 text-center font-semibold sm:table-cell" scope="col" title={m.table_played_label()}>
					{m.table_played()}
				</th>
				<th class="hidden py-2 px-1 text-center font-semibold md:table-cell" scope="col" title={m.table_wins_label()}>
					{m.table_wins()}
				</th>
				<th class="hidden py-2 px-1 text-center font-semibold md:table-cell" scope="col" title={m.table_draws_label()}>
					{m.table_draws()}
				</th>
				<th class="hidden py-2 px-1 text-center font-semibold md:table-cell" scope="col" title={m.table_losses_label()}>
					{m.table_losses()}
				</th>
				<th class="hidden py-2 px-1 text-center font-semibold md:table-cell" scope="col" title={m.table_goals_for_label()}>
					{m.table_goals_for()}
				</th>
				<th class="hidden py-2 px-1 text-center font-semibold md:table-cell" scope="col" title={m.table_goals_against_label()}>
					{m.table_goals_against()}
				</th>
				<th class="hidden py-2 px-1 text-center font-semibold sm:table-cell" scope="col" title={m.table_goal_diff_label()}>
					{m.table_goal_diff()}
				</th>
				<th class="py-2 pr-3 pl-1 text-center font-semibold" scope="col" title={m.table_points_label()}>
					{m.table_points()}
				</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (row.clubName)}
				{@const zone = zones[i]}
				<tr class="border-t border-line">
					<td class="relative py-2.5 pr-1 pl-3 text-ink-secondary">
						{#if zone?.color}
							<span
								aria-hidden="true"
								class="absolute inset-y-1 left-0 w-[3px] rounded-full"
								style:background-color={zone.color}
							></span>
						{/if}
						{i + 1}
					</td>
					<td class="py-2.5 pr-1">
						<Emblem src={row.clubEmblem} name={row.clubName} size={24} decorative />
					</td>
					<td class="min-w-0 py-2.5 pr-2">
						<a href={row.clubUrl} class="block truncate text-body text-ink hover:text-accent-text">
							{row.clubName}
						</a>
					</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary sm:table-cell">{row.played}</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary md:table-cell">{row.wins}</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary md:table-cell">{row.draws}</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary md:table-cell">{row.losses}</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary md:table-cell">{row.gf}</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary md:table-cell">{row.ga}</td>
					<td class="hidden py-2.5 px-1 text-center text-ink-secondary sm:table-cell">
						{row.gf - row.ga}
					</td>
					<td class="py-2.5 pr-3 pl-1 text-center font-semibold text-ink">{row.points}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
