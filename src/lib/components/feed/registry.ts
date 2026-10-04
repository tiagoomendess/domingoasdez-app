import type { Component } from 'svelte';
import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon';
import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
import ArticleCard from './ArticleCard.svelte';
import PollCard from './PollCard.svelte';
import type { Icon } from '#lib/components/types.ts';
import type { ArticleCardData, FeedType, FeedTypeParam, PollCardData } from '#lib/feed.ts';
import { m } from '#lib/messages.ts';

type ArticleEntry = {
	component: Component<ArticleCardData>;
	label: () => string;
	icon: Icon;
	param: FeedTypeParam;
};

type PollEntry = {
	component: Component<PollCardData>;
	label: () => string;
	icon: Icon;
	param: FeedTypeParam;
};

export const feedTypes: { article: ArticleEntry; poll: PollEntry } = {
	article: {
		component: ArticleCard,
		label: () => m.feed_articles(),
		icon: NewspaperIcon,
		param: 'artigos'
	},
	poll: {
		component: PollCard,
		label: () => m.feed_polls(),
		icon: ChartBarHorizontalIcon,
		param: 'sondagens'
	}
};

export const feedTypeOrder: FeedType[] = ['article', 'poll'];

export function chipOptions() {
	return feedTypeOrder.map((type) => ({
		value: type,
		label: feedTypes[type].label(),
		icon: feedTypes[type].icon
	}));
}
