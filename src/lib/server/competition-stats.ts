/**
 * Server loader for competition statistics.
 * Ports CompetitionStatsController with safe empty handling and multi-club ties.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import {
	buildPlayerHref,
	firstAndLastName,
	rankAttack,
	rankDefense,
	rankScorers,
	shuffleClubs,
	type ExtremeClubs,
	type StatsScorer,
	type TeamGoalInput
} from '#lib/competition-stats.ts';
import { formatSeasonShort, seasonNameSlug } from '#lib/competitions.ts';
import { competitionHref } from '#lib/games.ts';
import { slugify } from '#lib/slug.ts';
import type { ResolvedSeason } from '#lib/server/competition-page.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	gameGroups,
	games,
	goals,
	groupRules,
	players,
	teams
} from '#lib/server/db/schema.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { mediaUrl } from '#lib/server/media.ts';

const DEFAULT_PROFILE = '/images/default-profile.png';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeClub = alias(clubs, 'home_club');
const awayClub = alias(clubs, 'away_club');

export type CompetitionStatsPage = {
	seasonId: number;
	competitionId: number;
	displayName: string;
	displaySlug: string;
	emblem: string | null;
	seasonSlug: string;
	seasonLabel: string;
	competitionHref: string;
	/** Same gate as the competition page: hide Classificação when no points groups. */
	hasPointsGroup: boolean;
	scorers: StatsScorer[];
	attack: ExtremeClubs;
	defense: ExtremeClubs;
};

function displayName(seasonName: string | null, competitionName: string): string {
	return seasonName?.trim() || competitionName;
}

function displayPicture(
	seasonPicture: string | null,
	competitionPicture: string | null
): string | null {
	return mediaUrl(seasonPicture?.trim() || competitionPicture);
}

function playerPicture(path: string | null | undefined): string | null {
	return mediaUrl(path?.trim() || DEFAULT_PROFILE);
}

/**
 * Load season stats. Never throws on empty data — returns empty scorers / extremes.
 */
export async function loadCompetitionStats(
	season: ResolvedSeason
): Promise<CompetitionStatsPage> {
	const name = displayName(season.name, season.competitionName);
	const slug = slugify(name);
	const seasonSlug = seasonNameSlug(season.startYear, season.endYear);
	const href = competitionHref({
		startYear: season.startYear,
		endYear: season.endYear,
		displayName: name
	});

	const header = {
		seasonId: season.id,
		competitionId: season.competitionId,
		displayName: name,
		displaySlug: slug,
		emblem: displayPicture(season.picture, season.competitionPicture),
		seasonSlug,
		seasonLabel: formatSeasonShort(season.startYear, season.endYear),
		competitionHref: href,
		hasPointsGroup: false
	};

	const empty: CompetitionStatsPage = {
		...header,
		scorers: [],
		attack: { best: [], worst: [] },
		defense: { best: [], worst: [] }
	};

	try {
		const [pointsGroupRows, gameRows] = await Promise.all([
			db
				.select({ id: gameGroups.id })
				.from(gameGroups)
				.innerJoin(groupRules, eq(gameGroups.groupRulesId, groupRules.id))
				.where(and(eq(gameGroups.seasonId, season.id), eq(groupRules.type, 'points')))
				.limit(1),
			db
				.select({
					id: games.id,
					homeTeamId: games.homeTeamId,
					awayTeamId: games.awayTeamId,
					homeClubId: homeClub.id,
					homeClubName: homeClub.name,
					homeClubEmblem: homeClub.emblem,
					awayClubId: awayClub.id,
					awayClubName: awayClub.name,
					awayClubEmblem: awayClub.emblem
				})
				.from(games)
				.innerJoin(gameGroups, eq(games.gameGroupId, gameGroups.id))
				.innerJoin(homeTeam, eq(games.homeTeamId, homeTeam.id))
				.innerJoin(homeClub, eq(homeTeam.clubId, homeClub.id))
				.innerJoin(awayTeam, eq(games.awayTeamId, awayTeam.id))
				.innerJoin(awayClub, eq(awayTeam.clubId, awayClub.id))
				.where(eq(gameGroups.seasonId, season.id))
		]);

		header.hasPointsGroup = pointsGroupRows.length > 0;
		empty.hasPointsGroup = header.hasPointsGroup;

		if (gameRows.length === 0) return empty;

		const gameIds = gameRows.map((g) => g.id);
		const goalRows = await db
			.select({
				playerId: goals.playerId,
				teamId: goals.teamId,
				gameId: goals.gameId,
				ownGoal: goals.ownGoal
			})
			.from(goals)
			.where(inArray(goals.gameId, gameIds));

		// --- Scorers ---
		const ranked = rankScorers(goalRows);
		let scorers: StatsScorer[] = [];
		if (ranked.length > 0) {
			const playerRows = await db
				.select({
					id: players.id,
					name: players.name,
					nickname: players.nickname,
					picture: players.picture
				})
				.from(players)
				.where(
					inArray(
						players.id,
						ranked.map((r) => r.playerId)
					)
				);

			const byId = new Map(playerRows.map((p) => [p.id, p]));
			scorers = ranked
				.map((r) => {
					const player = byId.get(r.playerId);
					if (!player) return null;
					return {
						playerId: player.id,
						name: player.name,
						shortName: firstAndLastName(player.name),
						nickname: player.nickname,
						picture: playerPicture(player.picture),
						href: buildPlayerHref(player.id, player.name),
						goals: r.goals
					} satisfies StatsScorer;
				})
				.filter((s): s is StatsScorer => s != null);
		}

		// --- Per-team goals for / against (Goal rows, matching legacy) ---
		const teamMeta = new Map<
			number,
			{ clubId: number; clubName: string; clubEmblem: string | null }
		>();
		for (const g of gameRows) {
			if (!teamMeta.has(g.homeTeamId)) {
				teamMeta.set(g.homeTeamId, {
					clubId: g.homeClubId,
					clubName: g.homeClubName,
					clubEmblem: emblemUrl(g.homeClubEmblem)
				});
			}
			if (!teamMeta.has(g.awayTeamId)) {
				teamMeta.set(g.awayTeamId, {
					clubId: g.awayClubId,
					clubName: g.awayClubName,
					clubEmblem: emblemUrl(g.awayClubEmblem)
				});
			}
		}

		const goalsByGameTeam = new Map<string, number>();
		for (const goal of goalRows) {
			const key = `${goal.gameId}:${goal.teamId}`;
			goalsByGameTeam.set(key, (goalsByGameTeam.get(key) ?? 0) + 1);
		}

		const goalsFor = new Map<number, number>();
		const goalsAgainst = new Map<number, number>();
		for (const teamId of teamMeta.keys()) {
			goalsFor.set(teamId, 0);
			goalsAgainst.set(teamId, 0);
		}

		// Attack: count all Goal rows by team_id (legacy getBestAndWorstAttack)
		for (const goal of goalRows) {
			if (!teamMeta.has(goal.teamId)) continue;
			goalsFor.set(goal.teamId, (goalsFor.get(goal.teamId) ?? 0) + 1);
		}

		// Defense: opponent Goal-row counts per game (legacy getTotalHome/AwayGoals)
		for (const g of gameRows) {
			const homeScored = goalsByGameTeam.get(`${g.id}:${g.homeTeamId}`) ?? 0;
			const awayScored = goalsByGameTeam.get(`${g.id}:${g.awayTeamId}`) ?? 0;
			goalsAgainst.set(g.homeTeamId, (goalsAgainst.get(g.homeTeamId) ?? 0) + awayScored);
			goalsAgainst.set(g.awayTeamId, (goalsAgainst.get(g.awayTeamId) ?? 0) + homeScored);
		}

		const teamInputs: TeamGoalInput[] = [...teamMeta.entries()].map(([teamId, meta]) => ({
			teamId,
			clubId: meta.clubId,
			clubName: meta.clubName,
			clubEmblem: meta.clubEmblem,
			goalsFor: goalsFor.get(teamId) ?? 0,
			goalsAgainst: goalsAgainst.get(teamId) ?? 0
		}));

		const attackRaw = rankAttack(teamInputs);
		const defenseRaw = rankDefense(teamInputs);

		return {
			...header,
			scorers,
			attack: {
				best: shuffleClubs(attackRaw.best),
				worst: shuffleClubs(attackRaw.worst)
			},
			defense: {
				best: shuffleClubs(defenseRaw.best),
				worst: shuffleClubs(defenseRaw.worst)
			}
		};
	} catch (err) {
		console.error('loadCompetitionStats failed', err);
		return empty;
	}
}
