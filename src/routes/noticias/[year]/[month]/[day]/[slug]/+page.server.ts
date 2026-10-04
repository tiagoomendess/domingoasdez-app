import { error } from '@sveltejs/kit';
import { getArticleByPath } from '#lib/server/articles/index.ts';
import { m } from '#lib/messages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const article = await getArticleByPath(params);
	if (!article) error(404, m.article_not_found());
	return { article };
};
