/**
 * Score predictions on the game page. New in this app (the legacy site had none).
 *
 * A game is a knockout game when its group uses `elimination` rules: there's no draw, and a
 * level score is settled on penalties. Every other rule type (`points`, `friendly`, `other`)
 * allows a draw.
 */

export type GameKind = 'points' | 'knockout';
export type Side = 'home' | 'away';
export type Outcome = Side | 'draw';

export type Prediction = { home: number; away: number; penaltyWinner: Side | null };

/** A finished game's final score; `penalties` only when it was decided on penalties. */
export type GameResult = {
	home: number;
	away: number;
	penalties: { home: number; away: number } | null;
};

export type PredictionVerdict = {
	/** `void`: a knockout game that ended level with no penalties on file, so no winner. */
	winner: 'right' | 'wrong' | 'void';
	exact: boolean;
};

export type PredictionSummary = {
	total: number;
	/** `draw` is null in knockout games, where nobody can pick it. */
	outcomes: { home: number; draw: number | null; away: number };
	topScores: { home: number; away: number; count: number }[];
};

export const PREDICTION_MAX_GOALS = 20;

/** Predictions open this many days before kick-off, so nobody predicts a whole season ahead. */
export const PREDICTION_WINDOW_DAYS = 7;

export type PredictionWindow = 'early' | 'open' | 'closed';

/** When predictions open: kick-off minus the window. */
export function predictionsOpenAt(kickoffIso: string): Date {
	return new Date(new Date(kickoffIso).getTime() - PREDICTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * `early` until the window opens, `open` until kick-off, then `closed`. Finished and postponed
 * games are closed (a postponed game reopens once it gets a new date and loses the flag).
 */
export function predictionWindow(
	game: { kickoffIso: string; finished: boolean; postponed: boolean },
	now = new Date()
): PredictionWindow {
	const kickoff = new Date(game.kickoffIso).getTime();
	if (game.finished || game.postponed || Number.isNaN(kickoff) || now.getTime() > kickoff) {
		return 'closed';
	}
	return now < predictionsOpenAt(game.kickoffIso) ? 'early' : 'open';
}

export function gameKind(rulesType: string | null | undefined): GameKind {
	return rulesType === 'elimination' ? 'knockout' : 'points';
}

function parseGoals(value: unknown): number | null {
	const text = typeof value === 'number' ? String(value) : String(value ?? '').trim();
	if (!/^\d{1,2}$/.test(text)) return null;
	const goals = Number(text);
	return goals <= PREDICTION_MAX_GOALS ? goals : null;
}

/**
 * Checks a prediction as it comes from the form. Goals are whole numbers from 0 to 20. A knockout
 * game predicted to end level needs a penalty winner; any other prediction drops it.
 */
export function validatePrediction(
	input: { home: unknown; away: unknown; penaltyWinner: unknown },
	kind: GameKind
): { ok: true; prediction: Prediction } | { ok: false } {
	const home = parseGoals(input.home);
	const away = parseGoals(input.away);
	if (home == null || away == null) return { ok: false };

	if (kind === 'knockout' && home === away) {
		const side = input.penaltyWinner;
		if (side !== 'home' && side !== 'away') return { ok: false };
		return { ok: true, prediction: { home, away, penaltyWinner: side } };
	}
	return { ok: true, prediction: { home, away, penaltyWinner: null } };
}

export function predictedOutcome(prediction: Prediction, kind: GameKind): Outcome {
	if (prediction.home !== prediction.away)
		return prediction.home > prediction.away ? 'home' : 'away';
	// A level pick in a knockout game goes through on penalties. A stored draw without one only
	// happens when the group's rules changed after the prediction was made.
	if (kind === 'knockout' && prediction.penaltyWinner) return prediction.penaltyWinner;
	return 'draw';
}

/** Who won. Null when nobody did: a knockout game level with no penalties recorded. */
export function actualOutcome(result: GameResult, kind: GameKind): Outcome | null {
	if (result.home !== result.away) return result.home > result.away ? 'home' : 'away';
	// Points games: a draw is a draw, penalties or not (standings ignore them too).
	if (kind === 'points') return 'draw';
	const { penalties } = result;
	if (!penalties || penalties.home === penalties.away) return null;
	return penalties.home > penalties.away ? 'home' : 'away';
}

export function judgePrediction(
	prediction: Prediction,
	result: GameResult,
	kind: GameKind
): PredictionVerdict {
	const exact = prediction.home === result.home && prediction.away === result.away;
	const actual = actualOutcome(result, kind);
	if (actual == null) return { winner: 'void', exact };
	return { winner: predictedOutcome(prediction, kind) === actual ? 'right' : 'wrong', exact };
}

export type PredictionCountRow = {
	goalsHome: number;
	goalsAway: number;
	penaltyWinner: Side | null;
	count: number;
};

/** The community split: how many picked each outcome, and the most predicted scores. */
export function summarizePredictions(
	rows: PredictionCountRow[],
	kind: GameKind
): PredictionSummary {
	const outcomes = { home: 0, draw: kind === 'points' ? 0 : null, away: 0 } as {
		home: number;
		draw: number | null;
		away: number;
	};
	const scores = new Map<string, { home: number; away: number; count: number }>();

	for (const row of rows) {
		const outcome = predictedOutcome(
			{ home: row.goalsHome, away: row.goalsAway, penaltyWinner: row.penaltyWinner },
			kind
		);
		// A leftover draw in a knockout game (rules changed afterwards) has no bucket to go in.
		if (outcome === 'draw' && outcomes.draw == null) continue;
		if (outcome === 'draw') outcomes.draw = (outcomes.draw ?? 0) + row.count;
		else outcomes[outcome] += row.count;

		const key = `${row.goalsHome}-${row.goalsAway}`;
		const score = scores.get(key) ?? { home: row.goalsHome, away: row.goalsAway, count: 0 };
		score.count += row.count;
		scores.set(key, score);
	}

	const total = outcomes.home + (outcomes.draw ?? 0) + outcomes.away;
	const topScores = [...scores.values()]
		.sort((a, b) => b.count - a.count || a.home - b.home || a.away - b.away)
		.slice(0, 3);

	return { total, outcomes, topScores };
}

/** Whole percent of `count` in `total`, 0 when there's nothing to count. */
export function percentOf(count: number, total: number): number {
	return total > 0 ? Math.round((count / total) * 100) : 0;
}
