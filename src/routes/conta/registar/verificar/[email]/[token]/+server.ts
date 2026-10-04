import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyEmailToken } from '#lib/server/auth/register.ts';

export const GET: RequestHandler = async ({ params }) => {
	const email = decodeURIComponent(params.email ?? '').trim();
	const token = params.token ?? '';

	const result = await verifyEmailToken(email, token);

	if (result.ok) {
		throw redirect(303, '/conta/entrar?verified=1');
	}

	const encoded = encodeURIComponent(email || 'unknown');
	throw redirect(303, `/conta/registar/verificar/${encoded}?error=${result.error}`);
};
