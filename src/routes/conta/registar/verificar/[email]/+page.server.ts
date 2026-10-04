import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const email = decodeURIComponent(params.email ?? '').trim();
	if (!email) error(404);

	const raw = url.searchParams.get('error');
	const errorCode =
		raw === 'already_verified' || raw === 'missing' || raw === 'token_mismatch' ? raw : null;

	return { email, error: errorCode };
};
