import type { PollState } from '#lib/components/types.ts';

export type PollTiming = {
	closeAfter: string; // ISO
	showResultsAfter: string; // ISO
};

/**
 * Legacy poll card rules (minimal_poll.blade.php + PollsController@show):
 * - Voted → results if past show_results_after, else pending.
 * - Not voted + closed → results if past show_results_after, else pending.
 * - Not voted + open → open.
 */
export function pollState(
	poll: PollTiming,
	{ now, hasVoted }: { now: string | Date; hasVoted: boolean }
): PollState {
	const nowMs = typeof now === 'string' ? Date.parse(now) : now.getTime();
	const closeMs = Date.parse(poll.closeAfter);
	const showMs = Date.parse(poll.showResultsAfter);
	const closed = nowMs > closeMs;
	const resultsVisible = nowMs > showMs;

	if (hasVoted) return resultsVisible ? 'results' : 'pending';
	if (closed) return resultsVisible ? 'results' : 'pending';
	return 'open';
}

export function pollClosed(poll: Pick<PollTiming, 'closeAfter'>, now: string | Date): boolean {
	const nowMs = typeof now === 'string' ? Date.parse(now) : now.getTime();
	return nowMs > Date.parse(poll.closeAfter);
}
