import { error } from '@sveltejs/kit';
import { getPageBySlug } from '#lib/server/pages.ts';
import { m } from '#lib/messages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const page = await getPageBySlug(params.slug);
	if (!page) error(404, m.page_not_found());
	return { page };
};
