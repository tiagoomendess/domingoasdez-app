/**
 * Ports Api\CompetitionsController@getCompetitions and @getCompetitionsBySeasonSlug
 * (`GET /api/competitions` and `GET /api/competitions/{season_slug}`): the competitions with a
 * visible season in a given year span, by competition priority.
 */
import { and, asc, desc, eq } from 'drizzle-orm';
import { parseSeasonSlug, seasonNameSlug } from '#lib/competitions.ts';
import { db } from '#lib/server/db/index.ts';
import { competitions, seasons } from '#lib/server/db/schema.ts';
import { slugify } from '#lib/slug.ts';

/** PHP `!empty($value)` for a nullable string. */
function filled(value: string | null): value is string {
	return !!value && value !== '0';
}

/** Ports Season::getDisplayName: the season's own name, else the competition's. */
export function legacyDisplayName(seasonName: string | null, competitionName: string): string {
	return filled(seasonName) ? seasonName : competitionName;
}

/** Ports Season::getDisplayPicture: the raw stored path, no media prefix. */
export function legacyDisplayPicture(
	seasonPicture: string | null,
	competitionPicture: string | null
): string | null {
	return filled(seasonPicture) ? seasonPicture : competitionPicture;
}

export async function getCompetitions() {
	const [latest] = await db
		.select({ startYear: seasons.startYear, endYear: seasons.endYear })
		.from(seasons)
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(and(eq(seasons.visible, true), eq(competitions.visible, true)))
		.orderBy(desc(seasons.startYear), desc(seasons.endYear), asc(seasons.id))
		.limit(1);

	if (!latest) {
		return { season_slug: null, start_year: null, end_year: null, competitions: [] };
	}

	return getCompetitionsBySeasonSlug(seasonNameSlug(latest.startYear, latest.endYear));
}

/** Null when the slug doesn't parse or no visible season matches (legacy 404). */
export async function getCompetitionsBySeasonSlug(seasonSlug: string) {
	const years = parseSeasonSlug(seasonSlug);
	if (!years) return null;
	const [startYear, endYear] = years;

	const rows = await db
		.select({
			seasonId: seasons.id,
			seasonName: seasons.name,
			seasonPicture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			competitionId: competitions.id,
			competitionName: competitions.name,
			competitionPicture: competitions.picture
		})
		.from(seasons)
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(
			and(
				eq(seasons.visible, true),
				eq(seasons.startYear, startYear),
				eq(seasons.endYear, endYear),
				eq(competitions.visible, true)
			)
		)
		.orderBy(desc(competitions.priority), asc(competitions.id), asc(seasons.id));

	if (rows.length === 0) return null;

	return {
		season_slug: seasonNameSlug(rows[0].startYear, rows[0].endYear),
		start_year: startYear,
		end_year: endYear,
		competitions: rows.map((row) => {
			const name = legacyDisplayName(row.seasonName, row.competitionName);
			return {
				id: row.competitionId,
				season_id: row.seasonId,
				name,
				logo: legacyDisplayPicture(row.seasonPicture, row.competitionPicture),
				slug: slugify(name)
			};
		})
	};
}
