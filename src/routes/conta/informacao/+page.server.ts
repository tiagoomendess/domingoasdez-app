import { fail } from '@sveltejs/kit';
import { m } from '#lib/messages.ts';
import { captchaSiteKey } from '#lib/server/captcha.ts';
import { deleteInfoReport, loadInfoPage, submitInfoReport } from '#lib/server/info-reports.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = await loadInfoPage({
		user: locals.user,
		recaptchaSiteKey: captchaSiteKey(),
		lookupCode: url.searchParams.get('codigo') ?? url.searchParams.get('code'),
		justSentCode: url.searchParams.get('enviado'),
		justSentAnonymous: (url.searchParams.get('anonimo') ?? '1') !== '0'
	});

	return {
		...page,
		seo: {
			title: m.info_title(),
			description: m.info_meta_description()
		}
	};
};

export const actions: Actions = {
	send: async ({ request, locals, getClientAddress }) => {
		const form = await request.formData();
		const content = String(form.get('content') ?? '');
		const source = String(form.get('source') ?? '');
		const anonymous = form.get('anonymous');
		const ip = (() => {
			try {
				return getClientAddress();
			} catch {
				return '';
			}
		})();

		const result = await submitInfoReport({
			content,
			source,
			anonymous,
			user: locals.user,
			recaptchaToken: String(form.get('g-recaptcha-response') ?? '') || null,
			ipAddress: ip
		});

		if (!result.ok) {
			return fail(400, {
				action: 'send' as const,
				error: result.error,
				content,
				source
			});
		}

		return {
			action: 'send' as const,
			sent: true,
			code: result.code,
			anonymous: result.anonymous,
			content: '',
			source: ''
		};
	},

	lookup: async ({ request, locals }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const page = await loadInfoPage({
			user: locals.user,
			recaptchaSiteKey: captchaSiteKey(),
			lookupCode: code
		});
		if (!page.lookup) {
			return fail(404, {
				action: 'lookup' as const,
				error: 'missing' as const,
				code,
				lookupMissing: page.lookupMissing
			});
		}
		return {
			action: 'lookup' as const,
			lookup: page.lookup,
			code
		};
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const result = await deleteInfoReport({
			code: form.get('code'),
			user: locals.user
		});
		if (!result.ok) {
			return fail(result.error === 'forbidden' ? 403 : 400, {
				action: 'delete' as const,
				error: result.error
			});
		}
		return { action: 'delete' as const, deleted: true };
	}
};
