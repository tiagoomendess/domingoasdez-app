/**
 * The squads a controller picks substitutions from: the visible players of each team of the game
 * (`players.team_id`), the same list the game page's man-of-the-match vote uses. Photos follow
 * the site's rule: none for minors or players without a birth date, since the screen is public.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { isAdult, playerDisplayName } from '#lib/players.ts';
import type { PlacardSide } from '#lib/placard.ts';
import { db } from '#lib/server/db/index.ts';
import { players } from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';

/** A squad player as stored for the screen: `picture` is the `/storage/...` path or null. */
export type SquadPlayerRow = { id: number; name: string; picture: string | null };

export type PlacardSquads = Record<PlacardSide, SquadPlayerRow[]>;

export async function placardSquads(
	game: { homeTeamId: number; awayTeamId: number },
	now = new Date()
): Promise<PlacardSquads> {
	const rows = await db
		.select({
			id: players.id,
			teamId: players.teamId,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			birthDate: players.birthDate
		})
		.from(players)
		.where(
			and(inArray(players.teamId, [game.homeTeamId, game.awayTeamId]), eq(players.visible, true))
		)
		.orderBy(asc(players.name), asc(players.id));

	const squads: PlacardSquads = { home: [], away: [] };
	for (const row of rows) {
		const player = {
			id: row.id,
			name: playerDisplayName(row.name, row.nickname),
			picture: isAdult(row.birthDate, now) ? row.picture?.trim() || null : null
		};
		if (row.teamId === game.homeTeamId) squads.home.push(player);
		else if (row.teamId === game.awayTeamId) squads.away.push(player);
	}
	return squads;
}

/** The squads with browser URLs, for the controller's pickers. */
export const squadsForBrowser = (squads: PlacardSquads): PlacardSquads => ({
	home: squads.home.map((p) => ({ ...p, picture: mediaUrl(p.picture) })),
	away: squads.away.map((p) => ({ ...p, picture: mediaUrl(p.picture) }))
});
