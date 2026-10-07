import { and, asc, eq } from 'drizzle-orm';
import { partnerHref, type PartnerAd } from '#lib/partners.ts';
import { db } from '#lib/server/db/index.ts';
import { partnerClicks, partners } from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';

const CLICK_PAGE_MAX = 155;

/** Visible partners, highest priority first (lower number wins). Ties break by id. */
export async function listVisiblePartners(): Promise<PartnerAd[]> {
	const rows = await db
		.select({
			id: partners.id,
			name: partners.name,
			picture: partners.picture
		})
		.from(partners)
		.where(eq(partners.visible, true))
		.orderBy(asc(partners.priority), asc(partners.id));

	const ads: PartnerAd[] = [];
	for (const row of rows) {
		const image = mediaUrl(row.picture);
		if (!image) continue;
		ads.push({
			id: row.id,
			name: row.name,
			href: partnerHref(row.id),
			image
		});
	}
	return ads;
}

export async function getVisiblePartnerUrl(id: number): Promise<string | null> {
	if (!Number.isInteger(id) || id <= 0) return null;
	const [row] = await db
		.select({ url: partners.url })
		.from(partners)
		.where(and(eq(partners.id, id), eq(partners.visible, true)))
		.limit(1);
	return row?.url ?? null;
}

/** Record a click the way the legacy front does. A failed insert must not block the redirect. */
export async function recordPartnerClick(partnerId: number, referer: string | null): Promise<void> {
	const page = referer?.trim().slice(0, CLICK_PAGE_MAX) || null;
	try {
		await db.insert(partnerClicks).values({
			partnerId,
			page,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	} catch (err) {
		console.error('Failed to record partner click', err);
	}
}
