import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { partnerRedirectUrl } from '#lib/partners.ts';
import { getVisiblePartnerUrl, recordPartnerClick } from '#lib/server/partners.ts';
import type { RequestHandler } from './$types';

/** Track the click, then send the visitor to the partner. Matches the legacy `/parceiros/{id}` route. */
export const GET: RequestHandler = async ({ params, request, url }) => {
	const id = Number(params.id);
	const destination = await getVisiblePartnerUrl(id);
	if (!destination) error(404, m.partner_not_found());

	await recordPartnerClick(id, request.headers.get('referer'));

	const target = partnerRedirectUrl(destination, url.origin);
	if (!target) error(404, m.partner_not_found());

	redirect(302, target, { external: true });
};
