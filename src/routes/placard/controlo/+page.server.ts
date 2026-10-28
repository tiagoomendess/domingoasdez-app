import { redirect } from '@sveltejs/kit';
import { signInUrl } from '#lib/server/placard/access.ts';
import { placardGame } from '#lib/server/placard/games.ts';
import { controlledPlacards } from '#lib/server/placard/store.ts';
import type { PageServerLoad } from './$types';

/** "Os teus placards": the screens the user is controlling (to get back to one). */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, signInUrl('/placard/controlo'));
	const rows = await controlledPlacards(locals.user.id);
	const screens = await Promise.all(
		rows.map(async (row) => {
			const game = row.gameId ? await placardGame(row.gameId) : null;
			return {
				id: row.id,
				home: game?.home ?? null,
				away: game?.away ?? null,
				homeScore: row.homeScore,
				awayScore: row.awayScore
			};
		})
	);
	return { screens };
};
