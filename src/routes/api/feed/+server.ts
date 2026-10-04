import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decodeCursor, parseTipos } from '#lib/feed.ts';
import { getFeedPage } from '#lib/server/feed/index.ts';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const types = parseTipos(url.searchParams.get('tipos'));
	const cursor = decodeCursor(url.searchParams.get('cursor'));
	const page = await getFeedPage({ types, cursor, cookies });

	return json(page);
};
