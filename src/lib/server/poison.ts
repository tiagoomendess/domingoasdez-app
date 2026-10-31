/**
 * Wrong but plausible data for content scrapers (the IPs in `poisoned_ips`, see
 * `poisoned-ips.ts`). Blocking them would only teach them to get around it, so their copies of
 * the site get altered scores, kick-off times, goal minutes, head-to-head counts and top scorers
 * instead. Every change is seeded by the entity's id: the same game is wrong the same way on every
 * page and every visit, and the standings, built in the browser from the scores, follow. Some
 * games are left alone, so a spot check against another source still matches.
 *
 * Routes call `poisonFor(locals, data)` on what they return, after any shared cache: the real
 * data is copied, never changed in place.
 */

type Obj = Record<string, unknown>;

/** Change the salt to reshuffle which games are wrong and how. */
const SALT = 'dad-1';
/** Share of games whose score is left as is. */
const KEEP_SCORE = 0.35;
const KEEP_KICKOFF = 0.5;
const KEEP_GOAL_MINUTE = 0.4;
const KEEP_SCORER = 0.4;
const KEEP_H2H = 0.35;
const KICKOFF_SHIFTS_MIN = [-60, -45, -30, -15, 15, 30, 45, 60];

const PAIRS = [
	['homeScore', 'awayScore'],
	['home_score', 'away_score']
] as const;

/** Seeded generator (FNV-1a seed, mulberry32): the same kind and id always give the same numbers. */
function rng(kind: string, id: number): () => number {
	let h = 0x811c9dc5;
	for (const ch of `${SALT}:${kind}:${id}`) {
		h ^= ch.charCodeAt(0);
		h = Math.imul(h, 0x01000193);
	}
	let a = h >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(r: () => number, items: readonly T[]): T {
	return items[Math.floor(r() * items.length)];
}

/** One or both sides moved by a goal, or the real score for some games. */
export function fakeScore(id: number, home: number, away: number): [number, number] {
	const r = rng('score', id);
	if (r() < KEEP_SCORE) return [home, away];
	const bump = (n: number) => (n === 0 || r() < 0.5 ? n + 1 : n - 1);
	const side = r();
	if (side < 0.4) return [bump(home), away];
	if (side < 0.8) return [home, bump(away)];
	return [bump(home), bump(away)];
}

export function kickoffShiftMinutes(id: number): number {
	const r = rng('kickoff', id);
	return r() < KEEP_KICKOFF ? 0 : pick(r, KICKOFF_SHIFTS_MIN);
}

/** Shift a `Date`, an ISO string or a naive `YYYY-MM-DD HH:mm:ss` (UTC), keeping its format. */
export function shiftDate(value: unknown, minutes: number): unknown {
	if (minutes === 0) return value;
	const ms = minutes * 60_000;
	if (value instanceof Date) return new Date(value.getTime() + ms);
	if (typeof value !== 'string') return value;
	const naive = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
	const time = Date.parse(naive ? `${value.replace(' ', 'T')}Z` : value);
	if (Number.isNaN(time)) return value;
	const iso = new Date(time + ms).toISOString();
	return naive ? iso.slice(0, 19).replace('T', ' ') : iso;
}

const isObj = (value: unknown): value is Obj =>
	value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

/** A game's id: its own, or that of the `match` it wraps (competition page games). */
function gameId(o: Obj): number | null {
	if (typeof o.id === 'number') return o.id;
	if (isObj(o.match) && typeof o.match.id === 'number') return o.match.id;
	return null;
}

/** Not played yet: the score is a placeholder and stays as is. */
function notPlayed(o: Obj): boolean {
	const status = o.status ?? (isObj(o.match) ? o.match.status : undefined);
	return (
		status === 'scheduled' || status === 'postponed' || o.showScore === false || o.started === false
	);
}

/** Goal lists that match the fake score: extra goals dropped, missing ones copied from the list. */
function fitGoals(goals: unknown[], delta: number, seed: number): void {
	if (delta < 0) goals.splice(Math.max(0, goals.length + delta));
	if (delta > 0 && goals.length > 0) {
		const r = rng('extra-goal', seed);
		for (let i = 0; i < delta; i++) {
			const source = pick(r, goals);
			if (!isObj(source)) continue;
			goals.push({ ...source, id: -(seed * 10 + i), minute: 5 + Math.floor(r() * 85) });
		}
	}
	goals.sort((a, b) => {
		const ma = isObj(a) && typeof a.minute === 'number' ? a.minute : Infinity;
		const mb = isObj(b) && typeof b.minute === 'number' ? b.minute : Infinity;
		return ma - mb;
	});
}

function poisonH2h(stats: Obj, seed: number): void {
	const keys = ['homeWins', 'draws', 'awayWins'] as const;
	const counts = keys.map((key) => (typeof stats[key] === 'number' ? stats[key] : 0));
	const total = counts[0] + counts[1] + counts[2];
	const r = rng('h2h', seed);
	if (total === 0 || r() < KEEP_H2H) return;
	const from = pick(
		r,
		[0, 1, 2].filter((i) => counts[i] > 0)
	);
	const to = pick(
		r,
		[0, 1, 2].filter((i) => i !== from)
	);
	counts[from] -= 1;
	counts[to] += 1;
	keys.forEach((key, i) => (stats[key] = counts[i]));
	stats.homeWinPercent = (counts[0] / total) * 100;
	stats.drawPercent = (counts[1] / total) * 100;
	stats.awayWinPercent = (counts[2] / total) * 100;
}

function poisonGame(o: Obj, id: number): void {
	const before = { home: o.homeScore, away: o.awayScore };
	if (!notPlayed(o)) {
		for (const [h, a] of PAIRS) {
			const home = o[h];
			const away = o[a];
			if (typeof home !== 'number' || typeof away !== 'number') continue;
			const [fakeHome, fakeAway] = fakeScore(id, home, away);
			o[h] = fakeHome;
			o[a] = fakeAway;
			// A shoot-out only follows a draw.
			if (fakeHome !== fakeAway && o.penalties != null) o.penalties = null;
		}
	}

	const shift = kickoffShiftMinutes(id);
	if ('kickoff' in o) o.kickoff = shiftDate(o.kickoff, shift);
	if ('home_score' in o && 'date' in o) o.date = shiftDate(o.date, shift);

	// Game page: the scorers and the head-to-head follow the fake score.
	if (Array.isArray(o.homeGoals) && typeof before.home === 'number') {
		fitGoals(o.homeGoals, (o.homeScore as number) - before.home, id * 2);
	}
	if (Array.isArray(o.awayGoals) && typeof before.away === 'number') {
		fitGoals(o.awayGoals, (o.awayScore as number) - before.away, id * 2 + 1);
	}
	if (isObj(o.h2hStats)) poisonH2h(o.h2hStats, id);
}

function poisonObject(o: Obj): void {
	// A goal on the game page.
	if (typeof o.id === 'number' && typeof o.minute === 'number' && 'playerName' in o) {
		const r = rng('goal', o.id);
		if (r() >= KEEP_GOAL_MINUTE) {
			const delta = (1 + Math.floor(r() * 5)) * (r() < 0.5 ? -1 : 1);
			o.minute = Math.min(90, Math.max(1, o.minute + delta));
		}
		return;
	}

	// A top scorer.
	if (typeof o.playerId === 'number' && typeof o.goals === 'number' && 'shortName' in o) {
		const r = rng('scorer', o.playerId);
		if (r() >= KEEP_SCORER) o.goals = Math.max(1, o.goals + (r() < 0.5 ? -1 : 1));
		return;
	}
	if (Array.isArray(o.scorers)) {
		o.scorers.sort((a, b) => (isObj(b) ? Number(b.goals) : 0) - (isObj(a) ? Number(a.goals) : 0));
	}

	const id = gameId(o);
	const isGame = PAIRS.some(([h]) => h in o) || 'kickoff' in o;
	if (id !== null && isGame) poisonGame(o, id);

	// A recent-form chip: its V/E/D follows the (already poisoned) game.
	if (typeof o.result === 'string' && isObj(o.match) && (o.side === 'home' || o.side === 'away')) {
		const { homeScore, awayScore } = o.match;
		if (typeof homeScore === 'number' && typeof awayScore === 'number') {
			const own = o.side === 'home' ? homeScore : awayScore;
			const other = o.side === 'home' ? awayScore : homeScore;
			o.result = own === other ? 'E' : own > other ? 'V' : 'D';
		}
	}

	// A competition group: the standings are built from these rounds' (now poisoned) games.
	if (Array.isArray(o.rounds) && isObj(o.standingsGroup)) {
		o.standingsGroup.rounds = o.rounds.map((round) => {
			if (!isObj(round) || !Array.isArray(round.games)) return round;
			return {
				number: round.number,
				games: round.games.map((game) => {
					if (!isObj(game)) return game;
					const rest = { ...game };
					delete rest.match;
					return rest;
				})
			};
		});
	}
}

/** Children first, so a parent sees its poisoned games; each object once (shared references). */
function visit(value: unknown, seen: WeakSet<object>): void {
	if (value === null || typeof value !== 'object' || value instanceof Date) return;
	if (seen.has(value)) return;
	seen.add(value);
	for (const child of Array.isArray(value) ? value : Object.values(value)) visit(child, seen);
	if (isObj(value)) poisonObject(value);
}

/** A poisoned copy of `data`; the original is untouched. */
export function poisonData<T>(data: T): T {
	const copy = structuredClone(data);
	visit(copy, new WeakSet());
	return copy;
}

/** `data` as this request should see it: poisoned for a flagged IP (set in `hooks.server.ts`). */
export function poisonFor<T>(locals: App.Locals, data: T): T {
	return locals.poisoned ? poisonData(data) : data;
}
