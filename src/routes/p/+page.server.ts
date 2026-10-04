import { listVisiblePages } from '#lib/server/pages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const pages = await listVisiblePages();
	return { pages };
};
