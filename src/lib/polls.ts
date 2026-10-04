/**
 * Whether a vote may be stored.
 * Ports PollsController@vote: a logged-in user or an existing `poll{id}` cookie
 * cannot vote again. The same IP may cast a second vote (shared networks);
 * a third is refused and treated as already voted.
 */
export function decidePollVote(input: {
	closed: boolean;
	userVoteId: number | null;
	cookieVoteId: number | null;
	ipVoteIds: number[];
}): { action: 'closed' } | { action: 'keep'; voteId: number } | { action: 'record' } {
	if (input.closed) return { action: 'closed' };
	if (input.userVoteId != null) return { action: 'keep', voteId: input.userVoteId };
	if (input.cookieVoteId != null) return { action: 'keep', voteId: input.cookieVoteId };
	const firstIpVote = input.ipVoteIds[0];
	if (input.ipVoteIds.length > 1 && firstIpVote != null) {
		return { action: 'keep', voteId: firstIpVote };
	}
	return { action: 'record' };
}

/** Legacy cookie lifetime: 576000 minutes. */
export const POLL_COOKIE_MAX_AGE = 576_000 * 60;

export function pollCookieName(pollId: number): string {
	return `poll${pollId}`;
}
