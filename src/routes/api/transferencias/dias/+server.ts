import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidDay } from '#lib/games.ts';
import { getTransferDayMarkers } from '#lib/server/transfers.ts';

const MAX_SPAN_DAYS = 62;

function dayDiff(from: string, to: string): number {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	return Math.round((b - a) / 86_400_000);
}

/** Days with transfers in `[from, to]`, for the date rail and calendar dots. */
export const GET: RequestHandler = async ({ url }) => {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	if (!from || !to || !isValidDay(from) || !isValidDay(to)) {
		error(400, 'Invalid from/to');
	}

	if (from > to) error(400, 'from must be <= to');

	if (dayDiff(from, to) > MAX_SPAN_DAYS) {
		error(400, `Range too large (max ${MAX_SPAN_DAYS} days)`);
	}

	const markers = await getTransferDayMarkers(from, to);
	return Response.json({ markers });
};
