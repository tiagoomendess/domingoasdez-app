import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { findPlaygroundById, loadPlaygroundPage } from '#lib/server/playground-page.ts';
import { slugify } from '#lib/slug.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const playground = await findPlaygroundById(Number(params.id));
	if (!playground) error(404, m.playground_not_found());

	const canonicalSlug = slugify(playground.name);
	if (canonicalSlug && canonicalSlug !== params.slug) {
		redirect(301, `/campos/${playground.id}/${canonicalSlug}${url.search}`);
	}

	const page = await loadPlaygroundPage(playground, locals.user);
	return {
		...page,
		seo: {
			title: page.seo.title,
			description: m.playground_meta_description({ name: playground.name }),
			ogTitle: `${playground.name} - ${m.feed_brand()}`,
			ogImage: page.seo.ogImage
		}
	};
};
