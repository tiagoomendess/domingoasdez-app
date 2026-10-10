import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import {
	loadManageNotifications,
	saveManageNotifications,
	setFlashToast
} from '#lib/server/flash-interview.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const uuid = params.uuid;
	const pin = (url.searchParams.get('pin') ?? '').trim();

	const page = await loadManageNotifications({ uuid, pin });
	if (!page) throw error(404, m.flash_interview_not_found());

	return {
		notifications: page,
		pin,
		seo: {
			title: m.flash_interview_notif_title(),
			description: m.flash_interview_notif_meta_description()
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const uuid = params.uuid;
		const form = await request.formData();
		const pin = String(form.get('pin') ?? '');
		const contactEmail = String(form.get('contact_email') ?? '');

		const result = await saveManageNotifications({
			uuid,
			pin,
			contactEmail,
			notificationsEnabled: form.get('notifications_enabled')
		});

		if (!result.ok) {
			if (result.error === 'not_found') throw error(404, m.flash_interview_not_found());
			if (result.error === 'bad_pin') {
				setFlashToast(cookies, 'invalid');
				return fail(403, { error: 'bad_pin' as const, contactEmail });
			}
			return fail(400, { error: 'invalid_email' as const, contactEmail });
		}

		setFlashToast(cookies, 'notif_saved');
		throw redirect(
			303,
			`/flash-interview/${uuid}/manage-notifications?pin=${encodeURIComponent(pin.trim())}`
		);
	}
};
