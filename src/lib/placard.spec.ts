import { describe, expect, it } from 'vitest';
import {
	applyAction,
	elapsedMs,
	formatClock,
	HALF_MS,
	initialClock,
	MINUTE_MS,
	normalizePairingCode,
	parseAction,
	spacedCode,
	type PlacardMatchState
} from './placard.ts';

const T = 1_800_000_000_000;
const state = (overrides: Partial<PlacardMatchState> = {}): PlacardMatchState => ({
	homeScore: 0,
	awayScore: 0,
	clock: initialClock(),
	...overrides
});
const running = (elapsed: number, since: number) => ({
	elapsedMs: elapsed,
	runningSince: since,
	period: 'first_half' as const
});
const paused = (
	elapsed: number,
	period: 'first_half' | 'half_time' | 'second_half' = 'first_half'
) => ({
	elapsedMs: elapsed,
	runningSince: null,
	period
});

describe('elapsedMs', () => {
	it('adds the running time to the paused total', () => {
		expect(elapsedMs(running(60_000, T), T + 5_000)).toBe(65_000);
		expect(elapsedMs(paused(60_000), T + 5_000)).toBe(60_000);
	});

	it('never goes negative when the reference clock is behind', () => {
		expect(elapsedMs(running(0, T), T - 10_000)).toBe(0);
		expect(elapsedMs(running(30_000, T), T - 10_000)).toBe(30_000);
	});
});

describe('formatClock', () => {
	it('prints MM:SS without capping minutes', () => {
		expect(formatClock(0)).toBe('00:00');
		expect(formatClock(65_999)).toBe('01:05');
		expect(formatClock(HALF_MS)).toBe('45:00');
		expect(formatClock(100 * MINUTE_MS + 7_000)).toBe('100:07');
		expect(formatClock(-5)).toBe('00:00');
	});
});

describe('applyAction', () => {
	it('changes a side’s score within 0–99', () => {
		expect(applyAction(state(), { type: 'score', side: 'home', delta: 1 }, T).homeScore).toBe(1);
		expect(applyAction(state(), { type: 'score', side: 'away', delta: -1 }, T).awayScore).toBe(0);
		expect(
			applyAction(state({ awayScore: 99 }), { type: 'score', side: 'away', delta: 1 }, T).awayScore
		).toBe(99);
	});

	it('starts and pauses the clock in server time', () => {
		const started = applyAction(state(), { type: 'clock_toggle' }, T);
		expect(started.clock).toEqual(running(0, T));
		const stopped = applyAction(started, { type: 'clock_toggle' }, T + 90_000);
		expect(stopped.clock).toEqual(paused(90_000));
		const resumed = applyAction(stopped, { type: 'clock_toggle' }, T + 200_000);
		expect(elapsedMs(resumed.clock, T + 210_000)).toBe(100_000);
	});

	it('moves a minute either way, clamped at 0:00, keeping the clock running or paused', () => {
		const back = applyAction(
			state({ clock: paused(30_000) }),
			{ type: 'clock_adjust', deltaMs: -MINUTE_MS },
			T
		);
		expect(back.clock).toEqual(paused(0));

		const runningBack = applyAction(
			state({ clock: running(0, T) }),
			{ type: 'clock_adjust', deltaMs: -MINUTE_MS },
			T + 20_000
		);
		expect(runningBack.clock).toEqual(running(0, T + 20_000));

		const forward = applyAction(
			state({ clock: running(10_000, T) }),
			{ type: 'clock_adjust', deltaMs: MINUTE_MS },
			T + 5_000
		);
		expect(elapsedMs(forward.clock, T + 5_000)).toBe(75_000);
	});

	it('ends the first half at 45:00, then the second half starts from there', () => {
		const half = applyAction(
			state({ clock: running(0, T) }),
			{ type: 'half_time' },
			T + 46 * MINUTE_MS
		);
		expect(half.clock).toEqual(paused(HALF_MS, 'half_time'));
		const second = applyAction(half, { type: 'clock_toggle' }, T + 60 * MINUTE_MS);
		expect(second.clock.period).toBe('second_half');
		expect(elapsedMs(second.clock, T + 61 * MINUTE_MS)).toBe(46 * MINUTE_MS);
		expect(applyAction(second, { type: 'half_time' }, T + 62 * MINUTE_MS)).toBe(second);
	});

	it('resets to 00:00, paused, first half', () => {
		const reset = applyAction(state({ clock: running(5_000, T) }), { type: 'clock_reset' }, T);
		expect(reset.clock).toEqual(initialClock());
	});
});

describe('parseAction', () => {
	it('accepts the known actions', () => {
		expect(parseAction({ type: 'score', side: 'home', delta: -1 })).toEqual({
			type: 'score',
			side: 'home',
			delta: -1
		});
		expect(parseAction({ type: 'clock_adjust', deltaMs: 60_000 })).toEqual({
			type: 'clock_adjust',
			deltaMs: 60_000
		});
		expect(parseAction({ type: 'end', extra: 1 })).toEqual({ type: 'end' });
	});

	it('refuses anything else', () => {
		expect(parseAction(null)).toBeNull();
		expect(parseAction({ type: 'score', side: 'home', delta: 5 })).toBeNull();
		expect(parseAction({ type: 'score', side: 'middle', delta: 1 })).toBeNull();
		expect(parseAction({ type: 'clock_adjust', deltaMs: 3_600_000 })).toBeNull();
		expect(parseAction({ type: 'drop_tables' })).toBeNull();
	});
});

describe('pairing codes', () => {
	it('normalises typed codes and refuses ambiguous characters', () => {
		expect(normalizePairingCode(' abc-23x ')).toBe('ABC23X');
		expect(normalizePairingCode('ABC 0O1')).toBeNull();
		expect(normalizePairingCode('ABC')).toBeNull();
	});

	it('prints codes in two groups', () => {
		expect(spacedCode('ABC23X')).toBe('ABC 23X');
	});
});
