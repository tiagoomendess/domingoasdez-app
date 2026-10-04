import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { pollAnswerVotes, pollAnswers, polls } from '#lib/server/db/schema.ts';
import { naiveToIso, nowIso } from '#lib/server/dates.ts';
import type { FeedCursor, FeedItem } from '#lib/feed.ts';
import { isBeforeCursor } from '#lib/feed.ts';
import type { PollAnswer } from '#lib/components/types.ts';
import { pollClosed, pollState } from '../pollState.ts';
import { toMysqlDatetime } from './articles.ts';

export type PollSourceCtx = {
	/** Cookie reader: `poll{id}` → truthy means voted (legacy). */
	hasVoted: (pollId: number) => boolean;
	now?: string;
};

export type PollSourcePageArgs = {
	before: FeedCursor | null;
	limit: number;
	ctx: PollSourceCtx;
};

/**
 * Polls sort after articles at the same timestamp. When the cursor is an article,
 * polls with the same date still belong on the next page (along with older ones).
 */
function pollCursorFilter(before: FeedCursor) {
	const naive = toMysqlDatetime(before.date);
	if (before.type === 'article') {
		return sql`${polls.publishAfter} <= ${naive}`;
	}
	return sql`(${polls.publishAfter} < ${naive} OR (${polls.publishAfter} = ${naive} AND ${polls.id} < ${before.id}))`;
}

async function voteCountsByAnswer(answerIds: number[]): Promise<Map<number, number>> {
	const counts = new Map<number, number>();
	if (answerIds.length === 0) return counts;

	const rows = await db
		.select({
			pollAnswerId: pollAnswerVotes.pollAnswerId,
			count: sql<number>`count(*)`.mapWith(Number)
		})
		.from(pollAnswerVotes)
		.where(inArray(pollAnswerVotes.pollAnswerId, answerIds))
		.groupBy(pollAnswerVotes.pollAnswerId);

	for (const row of rows) counts.set(row.pollAnswerId, row.count);
	return counts;
}

export async function fetchPollPage({
	before,
	limit,
	ctx
}: PollSourcePageArgs): Promise<FeedItem[]> {
	const now = ctx.now ?? nowIso();

	const rows = await db
		.select({
			id: polls.id,
			question: polls.question,
			slug: polls.slug,
			showResultsAfter: polls.showResultsAfter,
			publishAfter: polls.publishAfter,
			closeAfter: polls.closeAfter,
			image: polls.image
		})
		.from(polls)
		.where(and(eq(polls.visible, true), before ? pollCursorFilter(before) : undefined))
		.orderBy(desc(polls.publishAfter), desc(polls.id))
		.limit(limit);

	if (rows.length === 0) return [];

	const pollIds = rows.map((r) => r.id);
	const answerRows = await db
		.select({
			id: pollAnswers.id,
			pollId: pollAnswers.pollId,
			answer: pollAnswers.answer
		})
		.from(pollAnswers)
		.where(inArray(pollAnswers.pollId, pollIds))
		.orderBy(pollAnswers.id);

	const answersByPoll = new Map<number, { id: number; label: string }[]>();
	for (const a of answerRows) {
		const list = answersByPoll.get(a.pollId) ?? [];
		list.push({ id: a.id, label: a.answer });
		answersByPoll.set(a.pollId, list);
	}

	// Decide which polls need vote counts (results state only)
	const needVotes: number[] = [];
	const states = new Map<number, ReturnType<typeof pollState>>();
	for (const row of rows) {
		const timing = {
			closeAfter: naiveToIso(row.closeAfter),
			showResultsAfter: naiveToIso(row.showResultsAfter)
		};
		const state = pollState(timing, { now, hasVoted: ctx.hasVoted(row.id) });
		states.set(row.id, state);
		if (state === 'results') {
			for (const a of answersByPoll.get(row.id) ?? []) needVotes.push(a.id);
		}
	}

	const counts = await voteCountsByAnswer(needVotes);

	const items: FeedItem[] = [];
	for (const row of rows) {
		const date = naiveToIso(row.publishAfter);
		const closeAfter = naiveToIso(row.closeAfter);
		const showResultsAfter = naiveToIso(row.showResultsAfter);
		const state = states.get(row.id)!;
		const closed = pollClosed({ closeAfter }, now);
		const rawAnswers = answersByPoll.get(row.id) ?? [];

		const answers: PollAnswer[] = rawAnswers.map((a) => ({
			id: a.id,
			label: a.label,
			votes: state === 'results' ? (counts.get(a.id) ?? 0) : undefined
		}));

		const item: FeedItem = {
			type: 'poll',
			id: row.id,
			date,
			data: {
				href: `/sondagens/${row.slug}`,
				question: row.question,
				state,
				answers,
				closed,
				endsAt: state === 'open' ? closeAfter : undefined,
				resultsAt: state === 'pending' ? showResultsAfter : undefined
			}
		};

		if (before && !isBeforeCursor(item, before)) continue;
		items.push(item);
		if (items.length >= limit) break;
	}

	return items;
}
