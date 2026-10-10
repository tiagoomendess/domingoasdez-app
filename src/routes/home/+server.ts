import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Legacy /home alias → home feed. */
export const GET: RequestHandler = () => {
	redirect(301, '/');
};
