import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { formatSeasonLabel } from '#lib/competitions.ts';
import { competitionHref } from '#lib/games.ts';
import { db } from '#lib/server/db/index.ts';
import { competitions, seasons } from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';

export type CompetitionListItem = {
	id: number;
	name: string;
	seasonLabel: string | null;
	emblem: string | null;
	href: string | null;
};

/**
 * Visible competitions in priority order, with the latest visible season
 * providing the public display name, emblem, season subtitle, and detail href.
 */
export async function listCompetitions(): Promise<CompetitionListItem[]> {
	const comps = await db
		.select({
			id: competitions.id,
			name: competitions.name,
			picture: competitions.picture,
			priority: competitions.priority
		})
		.from(competitions)
		.where(eq(competitions.visible, true))
		.orderBy(desc(competitions.priority), asc(competitions.id));

	if (comps.length === 0) return [];

	const seasonRows = await db
		.select({
			id: seasons.id,
			competitionId: seasons.competitionId,
			name: seasons.name,
			picture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear
		})
		.from(seasons)
		.where(
			and(
				eq(seasons.visible, true),
				inArray(
					seasons.competitionId,
					comps.map((c) => c.id)
				)
			)
		)
		.orderBy(desc(seasons.startYear), desc(seasons.id));

	const latestByCompetition = new Map<number, (typeof seasonRows)[number]>();
	for (const season of seasonRows) {
		if (!latestByCompetition.has(season.competitionId)) {
			latestByCompetition.set(season.competitionId, season);
		}
	}

	return comps.map((comp) => {
		const season = latestByCompetition.get(comp.id);
		const displayName = season?.name?.trim() || comp.name;
		const picture = season?.picture?.trim() || comp.picture;

		return {
			id: comp.id,
			name: displayName,
			seasonLabel: season ? formatSeasonLabel(season.startYear, season.endYear) : null,
			emblem: mediaUrl(picture),
			href: season
				? competitionHref({
						startYear: season.startYear,
						endYear: season.endYear,
						displayName
					})
				: null
		};
	});
}
