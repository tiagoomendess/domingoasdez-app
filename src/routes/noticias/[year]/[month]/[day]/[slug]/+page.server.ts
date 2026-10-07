import { error } from '@sveltejs/kit';
import { getArticleByPath } from '#lib/server/articles/index.ts';
import { m } from '#lib/messages.ts';
import { listVisiblePartners } from '#lib/server/partners.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [article, partners] = await Promise.all([getArticleByPath(params), listVisiblePartners()]);
	if (!article) error(404, m.article_not_found());
	return { article, partners };
};
