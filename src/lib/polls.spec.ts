import { describe, expect, it } from 'vitest';
import { decidePollVote } from './polls';

describe('decidePollVote', () => {
	it('refuses a closed poll before any duplicate check', () => {
		expect(
			decidePollVote({
				closed: true,
				userVoteId: null,
				cookieVoteId: null,
				ipVoteIds: []
			})
		).toEqual({ action: 'closed' });
	});

	it('keeps a logged-in user on their existing vote', () => {
		expect(
			decidePollVote({
				closed: false,
				userVoteId: 9,
				cookieVoteId: null,
				ipVoteIds: []
			})
		).toEqual({ action: 'keep', voteId: 9 });
	});

	it('keeps the cookie vote', () => {
		expect(
			decidePollVote({
				closed: false,
				userVoteId: null,
				cookieVoteId: 4,
				ipVoteIds: []
			})
		).toEqual({ action: 'keep', voteId: 4 });
	});

	it('allows a second vote from the same IP, then keeps the first', () => {
		expect(
			decidePollVote({
				closed: false,
				userVoteId: null,
				cookieVoteId: null,
				ipVoteIds: [3]
			})
		).toEqual({ action: 'record' });

		expect(
			decidePollVote({
				closed: false,
				userVoteId: null,
				cookieVoteId: null,
				ipVoteIds: [3, 8]
			})
		).toEqual({ action: 'keep', voteId: 3 });
	});

	it('records when nothing blocks the vote', () => {
		expect(
			decidePollVote({
				closed: false,
				userVoteId: null,
				cookieVoteId: null,
				ipVoteIds: []
			})
		).toEqual({ action: 'record' });
	});
});
