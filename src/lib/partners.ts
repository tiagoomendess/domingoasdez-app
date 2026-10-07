/** One partner card after every this many feed posts. */
export const PARTNER_FEED_INTERVAL = 3;

export type PartnerAd = {
	id: number;
	name: string;
	/** Same-origin click tracker. The destination URL stays on the server. */
	href: string;
	image: string;
};

export function partnerHref(id: number): string {
	return `/parceiros/${id}`;
}

/**
 * Partner to show after the feed post at `index` (0-based).
 * Slots continue across pages and wrap by priority order.
 */
export function partnerAfterPost(partners: readonly PartnerAd[], index: number): PartnerAd | null {
	if (partners.length === 0 || index < 0) return null;
	const position = index + 1;
	if (position % PARTNER_FEED_INTERVAL !== 0) return null;
	const slot = position / PARTNER_FEED_INTERVAL - 1;
	return partners[slot % partners.length] ?? null;
}

/** Legacy click redirect: partner URL plus `from` set to this site's origin. */
export function partnerRedirectUrl(destination: string, from: string): string | null {
	let url: URL;
	try {
		url = new URL(destination);
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	url.searchParams.set('from', from);
	return url.toString();
}
