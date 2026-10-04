/**
 * Pure competition-stats helpers (ported from CompetitionStatsController).
 * Attack/defense ties return every club that shares the extreme value;
 * callers shuffle for display so the top card is random.
 */
import { slugify } from '#lib/slug.ts';

export type StatsClub = {
	teamId: number;
	clubId: number;
	clubName: string;
	clubEmblem: string | null;
	clubHref: string;
	goalCount: number;
};

export type StatsScorer = {
	playerId: number;
	name: string;
	shortName: string;
	nickname: string | null;
	picture: string | null;
	href: string;
	goals: number;
};

export type ExtremeClubs = {
	best: StatsClub[];
	worst: StatsClub[];
};

export type TeamGoalInput = {
	teamId: number;
	clubId: number;
	clubName: string;
	clubEmblem: string | null;
	goalsFor: number;
	goalsAgainst: number;
};

/** First + last name from a full name (legacy Player::firstAndLastName). */
export function firstAndLastName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return '';
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length < 2) return trimmed;
	return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function buildPlayerHref(id: number, name: string): string {
	return `/jogadores/${id}/${slugify(name)}`;
}

export function buildClubHref(clubName: string): string {
	return `/clubes/${slugify(clubName)}`;
}

/**
 * Top scorers: exclude own goals and null player_id, group by player, desc by count.
 */
export function rankScorers(
	goals: { playerId: number | null; ownGoal: boolean }[],
	limit = 10
): { playerId: number; goals: number }[] {
	const counts = new Map<number, number>();
	for (const goal of goals) {
		if (goal.ownGoal) continue;
		if (goal.playerId == null) continue;
		counts.set(goal.playerId, (counts.get(goal.playerId) ?? 0) + 1);
	}

	return [...counts.entries()]
		.map(([playerId, goalsCount]) => ({ playerId, goals: goalsCount }))
		.sort((a, b) => b.goals - a.goals)
		.slice(0, limit);
}

/**
 * Best attack = highest goalsFor; worst = lowest.
 * Returns every club tied at each extreme (empty arrays when no teams).
 */
export function rankAttack(teams: TeamGoalInput[]): ExtremeClubs {
	if (teams.length === 0) return { best: [], worst: [] };

	const max = Math.max(...teams.map((t) => t.goalsFor));
	const min = Math.min(...teams.map((t) => t.goalsFor));

	const toClub = (t: TeamGoalInput): StatsClub => ({
		teamId: t.teamId,
		clubId: t.clubId,
		clubName: t.clubName,
		clubEmblem: t.clubEmblem,
		clubHref: buildClubHref(t.clubName),
		goalCount: t.goalsFor
	});

	return {
		best: teams.filter((t) => t.goalsFor === max).map(toClub),
		worst: teams.filter((t) => t.goalsFor === min).map(toClub)
	};
}

/**
 * Best defense = fewest goalsAgainst; worst = most.
 */
export function rankDefense(teams: TeamGoalInput[]): ExtremeClubs {
	if (teams.length === 0) return { best: [], worst: [] };

	const min = Math.min(...teams.map((t) => t.goalsAgainst));
	const max = Math.max(...teams.map((t) => t.goalsAgainst));

	const toClub = (t: TeamGoalInput): StatsClub => ({
		teamId: t.teamId,
		clubId: t.clubId,
		clubName: t.clubName,
		clubEmblem: t.clubEmblem,
		clubHref: buildClubHref(t.clubName),
		goalCount: t.goalsAgainst
	});

	return {
		best: teams.filter((t) => t.goalsAgainst === min).map(toClub),
		worst: teams.filter((t) => t.goalsAgainst === max).map(toClub)
	};
}

/** Fisher–Yates shuffle (copies the array). */
export function shuffleClubs<T>(items: T[], random: () => number = Math.random): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}
	return result;
}
