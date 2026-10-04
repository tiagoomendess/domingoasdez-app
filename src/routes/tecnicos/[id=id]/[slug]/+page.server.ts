import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { findAgentById, loadAgentPage } from '#lib/server/agent-page.ts';
import { slugify } from '#lib/slug.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const id = Number.parseInt(params.id, 10);
	if (!Number.isFinite(id)) error(404, m.agent_not_found());

	const agent = await findAgentById(id);
	if (!agent) error(404, m.agent_not_found());

	const canonicalSlug = slugify(agent.name);
	if (canonicalSlug && canonicalSlug !== params.slug) {
		redirect(301, `/tecnicos/${agent.id}/${canonicalSlug}${url.search}`);
	}

	const page = await loadAgentPage(agent, locals.user);
	return {
		...page,
		seo: {
			...page.seo,
			title: agent.name,
			description: m.agent_meta_description(),
			ogTitle: `${agent.name} - ${m.feed_brand()}`
		}
	};
};
