import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Legacy article index → home feed. Article pages under this path are unchanged. */
export const GET: RequestHandler = () => {
	redirect(301, '/');
};
