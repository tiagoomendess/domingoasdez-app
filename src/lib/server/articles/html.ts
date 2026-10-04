import DOMPurify from 'isomorphic-dompurify';
import { mediaUrl } from '#lib/server/media.ts';

/**
 * Rewrite relative legacy media paths in HTML attributes to absolute URLs
 * served by the old site (MEDIA_BASE_URL).
 */
export function rewriteLegacyMediaUrls(html: string): string {
	return html.replace(
		/\b(src|href)=(["'])(\/(?:storage|images)\/[^"']*?)\2/gi,
		(_match, attr: string, quote: string, path: string) => {
			const absolute = mediaUrl(path.trim());
			return absolute ? `${attr}=${quote}${absolute}${quote}` : `${attr}=${quote}${path}${quote}`;
		}
	);
}

/** Sanitize CMS / article HTML and rewrite relative media paths for the frontend. */
export function prepareCmsHtml(html: string): string {
	const clean = DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
		ADD_TAGS: ['video', 'source'],
		ADD_ATTR: [
			'target',
			'controls',
			'autoplay',
			'loop',
			'muted',
			'playsinline',
			'preload',
			'poster',
			'width',
			'height',
			'border',
			'cellpadding',
			'cellspacing',
			'align'
		]
	});
	return rewriteLegacyMediaUrls(clean);
}

/** @deprecated Prefer prepareCmsHtml — kept for existing article imports. */
export const prepareArticleHtml = prepareCmsHtml;
