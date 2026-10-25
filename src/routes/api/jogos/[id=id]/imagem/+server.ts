import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateMatchImage, type MatchImageFormat } from '#lib/server/match-image/index.ts';

const FORMATS: Record<string, MatchImageFormat> = { quadrado: 'square', story: 'story' };

/**
 * The game's square (`?formato=quadrado`, the default) or story (`?formato=story`) image, as a
 * JPEG download. Signed-in users only, as on the legacy site.
 */
export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) error(401, 'Sign in to download the game image');

	const format = FORMATS[event.url.searchParams.get('formato') ?? 'quadrado'];
	if (!format) error(400, 'Unknown image format');

	const image = await generateMatchImage(event, Number(event.params.id), format, user.id);
	if (!image) error(404, 'Game not found');

	return new Response(Buffer.from(image.bytes), {
		headers: {
			'content-type': 'image/jpeg',
			'content-disposition': `attachment; filename=${image.fileName}`,
			'cache-control': 'no-store'
		}
	});
};
