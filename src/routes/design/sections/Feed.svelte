<script lang="ts">
	import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon';
	import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
	import DesignSection from '../DesignSection.svelte';
	import ChipGroup from '#lib/components/ui/ChipGroup.svelte';
	import ArticleCard from '#lib/components/feed/ArticleCard.svelte';
	import PollCard from '#lib/components/feed/PollCard.svelte';
	import { sampleFeed } from '../sample-data.ts';

	const feed = sampleFeed(Date.now());

	let types = $state<('article' | 'poll')[]>(['article', 'poll']);

	const visible = $derived(feed.filter((item) => types.includes(item.type)));
</script>

<DesignSection
	id="feed"
	title="Feed"
	description="Home: articles and polls in one feed, newest first. Each card is a single link."
>
	<ChipGroup
		label="Mostrar no feed"
		options={[
			{ value: 'article', label: 'Artigos', icon: NewspaperIcon },
			{ value: 'poll', label: 'Sondagens', icon: ChartBarHorizontalIcon }
		]}
		bind:value={types}
	/>

	<div class="space-y-3">
		{#each visible as item (`${item.type}-${item.id}`)}
			{#if item.type === 'article'}
				<ArticleCard
					href="#feed"
					title={item.title}
					excerpt={item.excerpt}
					image={item.image}
					date={item.date}
					meta={item.meta}
				/>
			{:else}
				<PollCard
					href="#feed"
					question={item.question}
					state={item.state}
					closed={item.closed}
					endsAt={item.endsAt}
					resultsAt={item.resultsAt}
					answers={item.answers}
				/>
			{/if}
		{/each}
	</div>
</DesignSection>
