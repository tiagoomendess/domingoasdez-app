import { describe, expect, it } from 'vitest';
import { pollState, pollClosed } from './pollState';

const base = {
	closeAfter: '2026-06-01T12:00:00.000Z',
	showResultsAfter: '2026-06-02T12:00:00.000Z'
};

describe('pollState', () => {
	it('is open when not voted and before close', () => {
		expect(pollState(base, { now: '2026-05-01T00:00:00.000Z', hasVoted: false })).toBe('open');
	});

	it('is pending when voted but before show_results_after', () => {
		expect(pollState(base, { now: '2026-05-01T00:00:00.000Z', hasVoted: true })).toBe('pending');
	});

	it('is results when voted and past show_results_after', () => {
		expect(pollState(base, { now: '2026-06-03T00:00:00.000Z', hasVoted: true })).toBe('results');
	});

	it('is pending when closed but results still hidden', () => {
		expect(pollState(base, { now: '2026-06-01T18:00:00.000Z', hasVoted: false })).toBe('pending');
	});

	it('is results when closed and past show_results_after', () => {
		expect(pollState(base, { now: '2026-06-03T00:00:00.000Z', hasVoted: false })).toBe('results');
	});

	it('treats equal close time as still open (legacy uses >)', () => {
		expect(pollState(base, { now: '2026-06-01T12:00:00.000Z', hasVoted: false })).toBe('open');
	});
});

describe('pollClosed', () => {
	it('is closed only after close_after', () => {
		expect(pollClosed(base, '2026-06-01T12:00:00.000Z')).toBe(false);
		expect(pollClosed(base, '2026-06-01T12:00:01.000Z')).toBe(true);
	});
});
