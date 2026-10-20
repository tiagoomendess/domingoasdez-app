import { error, fail, redirect } from '@sveltejs/kit';
import { getArticleByPath } from '#lib/server/articles/index.ts';
import {
	deleteArticleComment,
	listArticleComments,
	postArticleComment
} from '#lib/server/article-comments.ts';
import { m } from '#lib/messages.ts';
import { listVisiblePartners } from '#lib/server/partners.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [article, partners] = await Promise.all([getArticleByPath(params), listVisiblePartners()]);
	if (!article) error(404, m.article_not_found());
	const comments = await listArticleComments(article.id, locals.user?.id ?? null);
	return { article, partners, comments };
};

function parseId(value: FormDataEntryValue | null): number | null {
	const id = Number.parseInt(String(value ?? ''), 10);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Both actions need a signed-in user and the article this URL resolves to. */
async function commentContext({ params, locals, url }: RequestEvent) {
	if (!locals.user) {
		redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent(`${url.pathname}#comentarios`)}`);
	}
	const article = await getArticleByPath(params);
	if (!article) error(404, m.article_not_found());
	return { user: locals.user, article };
}

export const actions: Actions = {
	comment: async (event) => {
		const { user, article } = await commentContext(event);
		const form = await event.request.formData();
		const content = String(form.get('comment') ?? '');
		const parentId = parseId(form.get('parent'));

		const result = await postArticleComment({
			articleId: article.id,
			userId: user.id,
			content,
			parentId
		});
		if (!result.ok) {
			const status = result.error === 'too_fast' ? 429 : 400;
			return fail(status, { action: 'comment' as const, error: result.error, content, parentId });
		}
		return { action: 'comment' as const, commentId: result.id };
	},

	deleteComment: async (event) => {
		const { user, article } = await commentContext(event);
		const form = await event.request.formData();
		const commentId = parseId(form.get('id'));
		if (commentId == null)
			return fail(400, { action: 'delete' as const, error: 'not_found' as const });

		const result = await deleteArticleComment({
			articleId: article.id,
			commentId,
			userId: user.id
		});
		if (!result.ok) {
			return fail(result.error === 'forbidden' ? 403 : 404, {
				action: 'delete' as const,
				error: result.error
			});
		}
		return { action: 'delete' as const, deleted: commentId };
	}
};
