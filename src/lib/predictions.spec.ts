import { describe, expect, it } from 'vitest';
import {
	actualOutcome,
	gameKind,
	judgePrediction,
	percentOf,
	predictedOutcome,
	predictionWindow,
	predictionsOpenAt,
	summarizePredictions,
	validatePrediction,
	type PredictionCountRow
} from './predictions.ts';

describe('gameKind', () => {
	it('treats only elimination rules as knockout', () => {
		expect(gameKind('elimination')).toBe('knockout');
		expect(gameKind('points')).toBe('points');
		expect(gameKind('friendly')).toBe('points');
		expect(gameKind('other')).toBe('points');
		expect(gameKind(null)).toBe('points');
	});
});

describe('validatePrediction', () => {
	it('accepts whole numbers from 0 to 20, as numbers or form strings', () => {
		expect(validatePrediction({ home: '2', away: 1, penaltyWinner: null }, 'points')).toEqual({
			ok: true,
			prediction: { home: 2, away: 1, penaltyWinner: null }
		});
		expect(validatePrediction({ home: 20, away: 0, penaltyWinner: null }, 'points').ok).toBe(true);
	});

	it('refuses out-of-range or malformed goals', () => {
		for (const bad of [-1, 21, 1.5, '', 'x', '2a', null, undefined, '100']) {
			expect(validatePrediction({ home: bad, away: 0, penaltyWinner: null }, 'points').ok).toBe(
				false
			);
		}
	});

	it('needs a penalty winner for a level knockout pick', () => {
		expect(validatePrediction({ home: 1, away: 1, penaltyWinner: null }, 'knockout').ok).toBe(
			false
		);
		expect(validatePrediction({ home: 1, away: 1, penaltyWinner: 'x' }, 'knockout').ok).toBe(false);
		expect(validatePrediction({ home: 1, away: 1, penaltyWinner: 'away' }, 'knockout')).toEqual({
			ok: true,
			prediction: { home: 1, away: 1, penaltyWinner: 'away' }
		});
	});

	it('drops a penalty winner everywhere else', () => {
		expect(validatePrediction({ home: 2, away: 1, penaltyWinner: 'away' }, 'knockout')).toEqual({
			ok: true,
			prediction: { home: 2, away: 1, penaltyWinner: null }
		});
		expect(validatePrediction({ home: 1, away: 1, penaltyWinner: 'home' }, 'points')).toEqual({
			ok: true,
			prediction: { home: 1, away: 1, penaltyWinner: null }
		});
	});
});

describe('outcomes', () => {
	it('derives the predicted outcome', () => {
		expect(predictedOutcome({ home: 2, away: 1, penaltyWinner: null }, 'points')).toBe('home');
		expect(predictedOutcome({ home: 0, away: 3, penaltyWinner: null }, 'points')).toBe('away');
		expect(predictedOutcome({ home: 1, away: 1, penaltyWinner: null }, 'points')).toBe('draw');
		expect(predictedOutcome({ home: 1, away: 1, penaltyWinner: 'away' }, 'knockout')).toBe('away');
	});

	it('settles a points game on goals, ignoring penalties', () => {
		expect(actualOutcome({ home: 2, away: 2, penalties: { home: 5, away: 4 } }, 'points')).toBe(
			'draw'
		);
		expect(actualOutcome({ home: 1, away: 0, penalties: null }, 'points')).toBe('home');
	});

	it('settles a level knockout game on penalties, or not at all', () => {
		expect(actualOutcome({ home: 1, away: 1, penalties: { home: 3, away: 4 } }, 'knockout')).toBe(
			'away'
		);
		expect(actualOutcome({ home: 1, away: 1, penalties: null }, 'knockout')).toBeNull();
		expect(actualOutcome({ home: 0, away: 2, penalties: null }, 'knockout')).toBe('away');
	});
});

describe('judgePrediction', () => {
	const result = { home: 2, away: 1, penalties: null };

	it('marks an exact score, a right winner, and a miss', () => {
		expect(judgePrediction({ home: 2, away: 1, penaltyWinner: null }, result, 'points')).toEqual({
			winner: 'right',
			exact: true
		});
		expect(judgePrediction({ home: 3, away: 0, penaltyWinner: null }, result, 'points')).toEqual({
			winner: 'right',
			exact: false
		});
		expect(judgePrediction({ home: 1, away: 1, penaltyWinner: null }, result, 'points')).toEqual({
			winner: 'wrong',
			exact: false
		});
	});

	it('judges a penalties pick on the shoot-out winner', () => {
		const shootout = { home: 1, away: 1, penalties: { home: 5, away: 3 } };
		expect(
			judgePrediction({ home: 1, away: 1, penaltyWinner: 'home' }, shootout, 'knockout')
		).toEqual({ winner: 'right', exact: true });
		expect(
			judgePrediction({ home: 0, away: 0, penaltyWinner: 'away' }, shootout, 'knockout')
		).toEqual({ winner: 'wrong', exact: false });
	});

	it('voids the winner when a knockout game has none, but keeps an exact score', () => {
		const level = { home: 2, away: 2, penalties: null };
		expect(judgePrediction({ home: 2, away: 2, penaltyWinner: 'home' }, level, 'knockout')).toEqual(
			{ winner: 'void', exact: true }
		);
	});

	it('counts a leftover draw pick in a knockout game as wrong', () => {
		expect(judgePrediction({ home: 1, away: 1, penaltyWinner: null }, result, 'knockout')).toEqual({
			winner: 'wrong',
			exact: false
		});
	});
});

describe('summarizePredictions', () => {
	const rows: PredictionCountRow[] = [
		{ goalsHome: 2, goalsAway: 1, penaltyWinner: null, count: 5 },
		{ goalsHome: 1, goalsAway: 1, penaltyWinner: null, count: 3 },
		{ goalsHome: 0, goalsAway: 1, penaltyWinner: null, count: 3 },
		{ goalsHome: 3, goalsAway: 0, penaltyWinner: null, count: 1 }
	];

	it('counts outcomes and the top three scores, ties by score', () => {
		const summary = summarizePredictions(rows, 'points');
		expect(summary.total).toBe(12);
		expect(summary.outcomes).toEqual({ home: 6, draw: 3, away: 3 });
		expect(summary.topScores).toEqual([
			{ home: 2, away: 1, count: 5 },
			{ home: 0, away: 1, count: 3 },
			{ home: 1, away: 1, count: 3 }
		]);
	});

	it('has no draw bucket in knockout games and sends level picks to the penalty winner', () => {
		const summary = summarizePredictions(
			[
				{ goalsHome: 1, goalsAway: 1, penaltyWinner: 'away', count: 2 },
				{ goalsHome: 2, goalsAway: 0, penaltyWinner: null, count: 1 },
				{ goalsHome: 0, goalsAway: 0, penaltyWinner: null, count: 4 }
			],
			'knockout'
		);
		expect(summary.outcomes).toEqual({ home: 1, draw: null, away: 2 });
		expect(summary.total).toBe(3);
	});

	it('rounds percentages and survives an empty split', () => {
		expect(percentOf(1, 3)).toBe(33);
		expect(percentOf(0, 0)).toBe(0);
	});
});

describe('predictionWindow', () => {
	const kickoffIso = '2026-10-24T19:00:00.000Z';
	const game = { kickoffIso, finished: false, postponed: false };
	const at = (iso: string) => new Date(iso);

	it('opens 7 days before kick-off', () => {
		expect(predictionsOpenAt(kickoffIso).toISOString()).toBe('2026-10-17T19:00:00.000Z');
		expect(predictionWindow(game, at('2026-10-17T18:59:59.000Z'))).toBe('early');
		expect(predictionWindow(game, at('2026-10-17T19:00:00.000Z'))).toBe('open');
	});

	it('closes at kick-off, and for finished or postponed games', () => {
		expect(predictionWindow(game, at('2026-10-24T19:00:00.000Z'))).toBe('open');
		expect(predictionWindow(game, at('2026-10-24T19:00:01.000Z'))).toBe('closed');
		expect(predictionWindow({ ...game, finished: true }, at('2026-10-20T00:00:00.000Z'))).toBe(
			'closed'
		);
		expect(predictionWindow({ ...game, postponed: true }, at('2026-10-20T00:00:00.000Z'))).toBe(
			'closed'
		);
	});
});
