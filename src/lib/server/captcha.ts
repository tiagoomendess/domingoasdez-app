import { RECAPTCHA_PRIVATE_KEY, RECAPTCHA_SECRET_KEY } from '$app/env/private';
import { RECAPTCHA_PUBLIC_KEY, RECAPTCHA_SITE_KEY } from '$app/env/public';

function firstKey(...values: Array<string | undefined>): string {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed) return trimmed;
	}
	return '';
}

/** Site key for the v2 checkbox. Accepts the legacy `RECAPTCHA_PUBLIC_KEY` name. */
export function captchaSiteKey(): string | null {
	const key = firstKey(RECAPTCHA_SITE_KEY, RECAPTCHA_PUBLIC_KEY);
	return key || null;
}

/** Secret for siteverify. Accepts the legacy `RECAPTCHA_PRIVATE_KEY` name. */
export function captchaSecret(): string {
	return firstKey(RECAPTCHA_SECRET_KEY, RECAPTCHA_PRIVATE_KEY);
}

/** Same check the old site used: Google reCAPTCHA v2 `siteverify`. */
export async function verifyRecaptcha(token: string | null, remoteIp: string): Promise<boolean> {
	const secret = captchaSecret();
	if (!secret || !token) return false;

	const body = new URLSearchParams({
		secret,
		response: token,
		remoteip: remoteIp
	});

	try {
		const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});
		if (!res.ok) return false;
		const data = (await res.json()) as { success?: boolean };
		return Boolean(data.success);
	} catch {
		return false;
	}
}
