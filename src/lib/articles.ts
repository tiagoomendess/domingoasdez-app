import { slugify } from '#lib/slug.ts';

/** Canonical article URL — date parts are UTC calendar day (matches legacy feed links). */
export function articleHref(dateIso: string, title: string): string {
	const d = new Date(dateIso);
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `/noticias/${y}/${m}/${day}/${slugify(title)}`;
}

/** Extract a YouTube video id from watch / youtu.be / embed URLs. */
export function youtubeIdFromUrl(url: string): string | null {
	try {
		const parsed = new URL(url.trim());
		const host = parsed.hostname.replace(/^www\./, '');

		if (host === 'youtu.be') {
			const id = parsed.pathname.split('/').filter(Boolean)[0];
			return id || null;
		}

		if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
			const v = parsed.searchParams.get('v');
			if (v) return v;
			const parts = parsed.pathname.split('/').filter(Boolean);
			const embedIdx = parts.indexOf('embed');
			if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
			const shortsIdx = parts.indexOf('shorts');
			if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
		}
	} catch {
		return null;
	}
	return null;
}

const DAY_PART = /^\d{4}$/;
const MD_PART = /^\d{2}$/;

export function parseArticlePathParams(params: {
	year: string;
	month: string;
	day: string;
}): { year: string; month: string; day: string; dayStart: string; dayEnd: string } | null {
	const { year, month, day } = params;
	if (!DAY_PART.test(year) || !MD_PART.test(month) || !MD_PART.test(day)) return null;

	const y = Number(year);
	const m = Number(month);
	const d = Number(day);
	if (m < 1 || m > 12 || d < 1 || d > 31) return null;

	const start = new Date(Date.UTC(y, m - 1, d));
	if (start.getUTCFullYear() !== y || start.getUTCMonth() !== m - 1 || start.getUTCDate() !== d) {
		return null;
	}

	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 1);

	const fmt = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

	return {
		year,
		month,
		day,
		dayStart: fmt(start),
		dayEnd: fmt(end)
	};
}
