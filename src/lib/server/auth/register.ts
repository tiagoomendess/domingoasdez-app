import { eq, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '#lib/server/db/index.ts';
import { userProfiles, users } from '#lib/server/db/schema.ts';
import { hashPassword } from '#lib/server/auth/password.ts';
import { captchaSecret, captchaSiteKey, verifyRecaptcha } from '#lib/server/captcha.ts';
import { buildVerifyUrl, sendVerificationEmail } from '#lib/server/mail.ts';
import { m } from '#lib/messages.ts';

export type RegisterErrors = {
	name?: string;
	email?: string;
	password?: string;
	password_confirmation?: string;
	terms?: string;
	rgpd?: string;
	captcha?: string;
	form?: string;
};

export type RegisterAccountInput = {
	name: string;
	email: string;
	password: string;
	passwordConfirmation: string;
	terms: boolean;
	rgpd: boolean;
	recaptchaToken: string | null;
	ip: string;
	origin: string;
};

export type RegisterAccountResult =
	| { ok: true; email: string }
	| { ok: false; errors: RegisterErrors };

export type VerifyEmailError = 'already_verified' | 'missing' | 'token_mismatch';

export type VerifyEmailResult = { ok: true } | { ok: false; error: VerifyEmailError };

export type RegisterFieldErrors = {
	name?: 'required' | 'max';
	email?: 'required' | 'invalid' | 'max';
	password?: 'required' | 'min';
	password_confirmation?: 'mismatch';
	terms?: 'required';
	rgpd?: 'required';
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Pure field validation matching the legacy RegisterController rules (except unique + captcha). */
export function validateRegistrationFields(input: {
	name: string;
	email: string;
	password: string;
	passwordConfirmation: string;
	terms: boolean;
	rgpd: boolean;
}): RegisterFieldErrors {
	const errors: RegisterFieldErrors = {};
	const name = input.name.trim();
	const email = input.email.trim();

	if (!name) errors.name = 'required';
	else if (name.length > 155) errors.name = 'max';

	if (!email) errors.email = 'required';
	else if (email.length > 155) errors.email = 'max';
	else if (!EMAIL_RE.test(email)) errors.email = 'invalid';

	if (!input.password) errors.password = 'required';
	else if (input.password.length < 6) errors.password = 'min';

	if (input.password !== input.passwordConfirmation) {
		errors.password_confirmation = 'mismatch';
	}

	if (!input.terms) errors.terms = 'required';
	if (!input.rgpd) errors.rgpd = 'required';

	return errors;
}

export function mapFieldErrors(fieldErrors: RegisterFieldErrors): RegisterErrors {
	const errors: RegisterErrors = {};
	if (fieldErrors.name) errors.name = m.register_error_name();
	if (fieldErrors.email === 'required' || fieldErrors.email === 'invalid' || fieldErrors.email === 'max') {
		errors.email = m.register_error_email();
	}
	if (fieldErrors.password) errors.password = m.register_error_password();
	if (fieldErrors.password_confirmation) {
		errors.password_confirmation = m.register_error_password_confirmation();
	}
	if (fieldErrors.terms) errors.terms = m.register_error_terms();
	if (fieldErrors.rgpd) errors.rgpd = m.register_error_rgpd();
	return errors;
}

/** Laravel `str_random(16)` alphabet (A-Za-z0-9). */
export function generateEmailToken(length = 16): string {
	const bytes = randomBytes(length);
	let token = '';
	for (let i = 0; i < length; i++) {
		token += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length]!;
	}
	return token;
}

export async function registerAccount(input: RegisterAccountInput): Promise<RegisterAccountResult> {
	const name = input.name.trim();
	const email = input.email.trim();

	const fieldErrors = validateRegistrationFields({
		name,
		email,
		password: input.password,
		passwordConfirmation: input.passwordConfirmation,
		terms: input.terms,
		rgpd: input.rgpd
	});

	const errors = mapFieldErrors(fieldErrors);

	// When reCAPTCHA keys are configured, require the same v2 check as the legacy site.
	if (captchaSiteKey() && captchaSecret()) {
		const captchaOk = await verifyRecaptcha(input.recaptchaToken, input.ip);
		if (!captchaOk) {
			errors.captcha = m.register_error_captcha();
		}
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	const normalized = email.toLowerCase();
	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(sql`LOWER(${users.email}) = ${normalized}`)
		.limit(1);

	if (existing) {
		return { ok: false, errors: { email: m.register_error_email_taken() } };
	}

	const passwordHash = await hashPassword(input.password);
	const emailToken = generateEmailToken(16);
	const now = new Date();

	let userId: number | null = null;

	try {
		const inserted = await db.insert(users).values({
			name,
			email,
			password: passwordHash,
			emailToken,
			verified: false,
			createdAt: now,
			updatedAt: now
		});

		userId = Number(inserted[0].insertId);
		if (!Number.isSafeInteger(userId) || userId <= 0) {
			return { ok: false, errors: { form: m.register_error_form() } };
		}

		await db.insert(userProfiles).values({
			userId,
			accountDataConsent: now,
			createdAt: now,
			updatedAt: now
		});

		const verifyUrl = buildVerifyUrl(input.origin, email, emailToken);
		await sendVerificationEmail({ to: email, verifyUrl });

		return { ok: true, email };
	} catch (err) {
		if (userId != null) {
			try {
				await db.delete(users).where(eq(users.id, userId));
			} catch {
				// Best-effort rollback; legacy cron also clears unverified rows after ~15 minutes.
			}
		}

		const code =
			err && typeof err === 'object' && 'code' in err
				? String((err as { code?: string }).code)
				: '';
		if (code === 'ER_DUP_ENTRY') {
			return { ok: false, errors: { email: m.register_error_email_taken() } };
		}

		console.error('registerAccount failed', err);
		return { ok: false, errors: { form: m.register_error_form() } };
	}
}

export async function verifyEmailToken(email: string, token: string): Promise<VerifyEmailResult> {
	const normalizedEmail = email.trim();
	const normalizedToken = token.trim();
	if (!normalizedEmail || !normalizedToken) {
		return { ok: false, error: 'missing' };
	}

	const [row] = await db
		.select({
			id: users.id,
			verified: users.verified,
			emailToken: users.emailToken
		})
		.from(users)
		.where(eq(users.email, normalizedEmail))
		.limit(1);

	if (!row) {
		return { ok: false, error: 'missing' };
	}

	if (row.verified) {
		return { ok: false, error: 'already_verified' };
	}

	if (!row.emailToken || row.emailToken !== normalizedToken) {
		return { ok: false, error: 'token_mismatch' };
	}

	await db
		.update(users)
		.set({
			verified: true,
			emailToken: null,
			updatedAt: new Date()
		})
		.where(eq(users.id, row.id));

	return { ok: true };
}
