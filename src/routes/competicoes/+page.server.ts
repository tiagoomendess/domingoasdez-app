import { listCompetitions } from '#lib/server/competitions.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const competitions = await listCompetitions();
	return { competitions };
};
