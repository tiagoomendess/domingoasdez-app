import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Legacy live-games list → merged Games tab. */
export const GET: RequestHandler = () => {
	redirect(301, '/jogos');
};
