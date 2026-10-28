import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { AD_DEFAULT_SECONDS, parseHexColor } from '#lib/placard.ts';
import { slugify } from '#lib/slug.ts';
import { findClubBySlug } from '#lib/server/club-page.ts';
import { emblemUrl } from '#lib/server/games.ts';
import { signInUrl } from '#lib/server/placard/access.ts';
import {
	addAd,
	canManageClubPlacard,
	clubAdSpots,
	clubPlacardLook,
	deleteAd,
	moveAd,
	removeBackgroundImage,
	saveColors,
	setBackgroundImage,
	updateAdDuration,
	type SetupResult
} from '#lib/server/placard/club-setup.ts';
import { DEFAULT_PLACARD_THEME, resolvePlacardTheme } from '#lib/server/placard/theme.ts';
import { storageConfigured } from '#lib/server/storage.ts';
import type { Actions, PageServerLoad } from './$types';

/** The club, when the signed-in user may set up its screen; otherwise a redirect or a 403/404. */
async function managedClub({
	params,
	locals,
	url
}: Pick<RequestEvent, 'locals' | 'url'> & {
	params: { club: string };
}) {
	if (!locals.user) redirect(303, signInUrl(url.pathname));
	const club = await findClubBySlug(params.club);
	if (!club) error(404, m.club_not_found());
	if (!(await canManageClubPlacard(locals.user, club))) error(403, 'Forbidden');
	return club;
}

const errorMessage = (reason: Exclude<SetupResult, { ok: true }>['reason']) =>
	({
		invalid: m.placard_setup_error_invalid(),
		too_large: m.placard_setup_error_too_large(),
		too_many: m.placard_setup_error_too_many(),
		not_found: m.placard_setup_error_not_found(),
		unavailable: m.placard_setup_error_unavailable(),
		failed: m.placard_setup_error_failed()
	})[reason];

/** The form's answer: `{ section, message }` on failure, so the page shows it in the right card. */
const answer = (section: string, result: SetupResult) =>
	result.ok
		? { section, saved: true }
		: fail(400, { section, message: errorMessage(result.reason) });

const fileFrom = async (request: Request, name: string) => {
	const form = await request.formData();
	const file = form.get(name);
	return {
		form,
		bytes: file instanceof File && file.size > 0 ? new Uint8Array(await file.arrayBuffer()) : null
	};
};

const idFrom = (form: FormData) => {
	const id = Number(form.get('id'));
	return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * A club's stadium screen setup: look (colours, background image) and ad spots. For the club's
 * admin (`clubs.admin_user_id`) and users with `admin`. The screen uses it when the club is at home.
 */
export const load: PageServerLoad = async (event) => {
	const club = await managedClub(event);
	const [look, ads, theme] = await Promise.all([
		clubPlacardLook(club.id),
		clubAdSpots(club.id),
		resolvePlacardTheme(club.id)
	]);
	return {
		club: {
			name: club.name,
			emblem: emblemUrl(club.emblem) ?? '',
			href: `/clubes/${slugify(club.name)}`
		},
		look,
		ads,
		theme,
		defaults: {
			textColor: DEFAULT_PLACARD_THEME.foreground,
			backgroundColor: DEFAULT_PLACARD_THEME.background,
			adSeconds: AD_DEFAULT_SECONDS
		},
		uploads: storageConfigured()
	};
};

export const actions: Actions = {
	colors: async (event) => {
		const club = await managedClub(event);
		const form = await event.request.formData();
		const reset = form.get('reset') === '1';
		return answer(
			'colors',
			await saveColors(club.id, {
				textColor: reset ? null : parseHexColor(form.get('textColor')),
				backgroundColor: reset ? null : parseHexColor(form.get('backgroundColor'))
			})
		);
	},

	background: async (event) => {
		const club = await managedClub(event);
		const { bytes } = await fileFrom(event.request, 'image');
		if (!bytes) return answer('background', { ok: false, reason: 'invalid' });
		return answer('background', await setBackgroundImage(club.id, bytes));
	},

	removeBackground: async (event) => {
		const club = await managedClub(event);
		return answer('background', await removeBackgroundImage(club.id));
	},

	addAd: async (event) => {
		const club = await managedClub(event);
		const { form, bytes } = await fileFrom(event.request, 'image');
		if (!bytes) return answer('ads', { ok: false, reason: 'invalid' });
		return answer('ads', await addAd(club.id, bytes, Number(form.get('duration'))));
	},

	adDuration: async (event) => {
		const club = await managedClub(event);
		const form = await event.request.formData();
		const id = idFrom(form);
		if (!id) return answer('ads', { ok: false, reason: 'not_found' });
		return answer('ads', await updateAdDuration(club.id, id, Number(form.get('duration'))));
	},

	moveAd: async (event) => {
		const club = await managedClub(event);
		const form = await event.request.formData();
		const id = idFrom(form);
		if (!id) return answer('ads', { ok: false, reason: 'not_found' });
		return answer('ads', await moveAd(club.id, id, form.get('direction') === 'up' ? -1 : 1));
	},

	deleteAd: async (event) => {
		const club = await managedClub(event);
		const id = idFrom(await event.request.formData());
		if (!id) return answer('ads', { ok: false, reason: 'not_found' });
		return answer('ads', await deleteAd(club.id, id));
	}
};
