import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Legacy day-games list → merged Games tab. */
export const GET: RequestHandler = ({ url }) => {
	const date = url.searchParams.get('date');
	const target = date ? `/jogos?date=${encodeURIComponent(date)}` : '/jogos';
	redirect(301, target);
};
