import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addDays } from '#lib/format.ts';
import { isValidDay } from '#lib/games.ts';
import { getDayMarkers } from '#lib/server/games.ts';

const MAX_SPAN_DAYS = 62;

function dayDiff(from: string, to: string): number {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	return Math.round((b - a) / 86_400_000);
}

export const GET: RequestHandler = async ({ url }) => {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	if (!from || !to || !isValidDay(from) || !isValidDay(to)) {
		error(400, 'Invalid from/to');
	}

	if (from > to) error(400, 'from must be <= to');

	const span = dayDiff(from, to);
	if (span > MAX_SPAN_DAYS) {
		error(400, `Range too large (max ${MAX_SPAN_DAYS} days)`);
	}

	// Clamp empty ranges to a single day for safety
	const end = to || addDays(from, 0);
	const markers = await getDayMarkers(from, end);
	return json({ markers });
};
