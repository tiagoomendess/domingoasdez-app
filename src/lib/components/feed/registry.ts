import type { Component } from 'svelte';
import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon';
import ChartBarHorizontalIcon from 'phosphor-svelte/lib/ChartBarHorizontalIcon';
import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
import ArticleCard from './ArticleCard.svelte';
import PollCard from './PollCard.svelte';
import TransferDayCard from './TransferDayCard.svelte';
import type { Icon } from '#lib/components/types.ts';
import type {
	ArticleCardData,
	FeedType,
	FeedTypeParam,
	PollCardData,
	TransferDayCardData
} from '#lib/feed.ts';
import { m } from '#lib/messages.ts';

type FeedEntry<Data extends Record<string, unknown>> = {
	component: Component<Data>;
	label: () => string;
	icon: Icon;
	param: FeedTypeParam;
};

export const feedTypes: {
	article: FeedEntry<ArticleCardData>;
	poll: FeedEntry<PollCardData>;
	transfer: FeedEntry<TransferDayCardData>;
} = {
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
	},
	transfer: {
		component: TransferDayCard,
		label: () => m.feed_transfers(),
		icon: ArrowsLeftRightIcon,
		param: 'transferencias'
	}
};

export const feedTypeOrder: FeedType[] = ['article', 'poll', 'transfer'];

export function chipOptions() {
	return feedTypeOrder.map((type) => ({
		value: type,
		label: feedTypes[type].label(),
		icon: feedTypes[type].icon
	}));
}
