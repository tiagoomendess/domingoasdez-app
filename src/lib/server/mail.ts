import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
	MAIL_DRIVER,
	MAIL_ENCRYPTION,
	MAIL_FROM_ADDRESS,
	MAIL_FROM_NAME,
	MAIL_HOST,
	MAIL_PASSWORD,
	MAIL_PORT,
	MAIL_USERNAME
} from '$app/env/private';
import { m } from '#lib/messages.ts';

export type VerificationEmailInput = {
	to: string;
	verifyUrl: string;
	siteName?: string;
};

export type BuiltEmail = {
	from: string;
	to: string;
	subject: string;
	text: string;
	html: string;
	verifyUrl?: string;
};

/** Build the verification email (no I/O) — same copy as the legacy VerifyEmailNotification. */
export function buildVerificationEmail(input: VerificationEmailInput): BuiltEmail {
	const siteName = input.siteName?.trim() || MAIL_FROM_NAME;
	const subject = m.register_email_subject({ site_name: siteName });
	const greeting = m.register_email_greeting();
	const p1 = m.register_email_p1();
	const action = m.register_email_action();
	const p2 = m.register_email_p2();
	const thanks = m.register_email_thanks();
	const foot = m.register_email_foot_note({
		action_text: action,
		action_url: input.verifyUrl
	});

	const text = [greeting, '', p1, '', `${action}: ${input.verifyUrl}`, '', p2, '', thanks, '', foot]
		.join('\n')
		.trim();

	const html = `<!DOCTYPE html>
<html lang="pt">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; line-height: 1.5; margin: 0; padding: 24px;">
  <p>${escapeHtml(greeting)}</p>
  <p>${escapeHtml(p1)}</p>
  <p style="margin: 28px 0;">
    <a href="${escapeAttr(input.verifyUrl)}" style="display: inline-block; background: #107db7; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600;">
      ${escapeHtml(action)}
    </a>
  </p>
  <p>${escapeHtml(p2)}</p>
  <p>${escapeHtml(thanks)}</p>
  <p style="font-size: 13px; color: #6c6c70;">${escapeHtml(foot)}</p>
</body>
</html>`;

	return {
		from: formatFrom(MAIL_FROM_ADDRESS, MAIL_FROM_NAME),
		to: input.to,
		subject,
		text,
		html,
		verifyUrl: input.verifyUrl
	};
}

export type PasswordChangedEmailInput = {
	to: string;
	name: string;
	email: string;
	siteName?: string;
};

/** Build the password-changed notice — same copy as legacy PasswordChangedNotification. */
export function buildPasswordChangedEmail(input: PasswordChangedEmailInput): BuiltEmail {
	const siteName = input.siteName?.trim() || MAIL_FROM_NAME;
	const subject = m.password_changed_email_subject({ site_name: siteName });
	const greeting = m.password_changed_email_greeting({ name: input.name });
	const body = m.password_changed_email_body({ email: input.email });
	const thanks = m.password_changed_email_thanks();

	const text = [greeting, '', body, '', thanks].join('\n').trim();
	const html = `<!DOCTYPE html>
<html lang="pt">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; line-height: 1.5; margin: 0; padding: 24px;">
  <p>${escapeHtml(greeting)}</p>
  <p>${escapeHtml(body)}</p>
  <p>${escapeHtml(thanks)}</p>
</body>
</html>`;

	return {
		from: formatFrom(MAIL_FROM_ADDRESS, MAIL_FROM_NAME),
		to: input.to,
		subject,
		text,
		html
	};
}

export function buildVerifyUrl(origin: string, email: string, token: string): string {
	const base = origin.replace(/\/$/, '');
	return `${base}/conta/registar/verificar/${encodeURIComponent(email)}/${encodeURIComponent(token)}`;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (transporter) return transporter;

	const driver = MAIL_DRIVER.trim().toLowerCase() || 'smtp';
	if (driver !== 'smtp') {
		throw new Error(`Unsupported MAIL_DRIVER "${driver}". Only smtp is supported.`);
	}

	const host = MAIL_HOST.trim();
	if (!host) throw new Error('MAIL_HOST is not set.');

	const encryption = MAIL_ENCRYPTION.trim().toLowerCase();
	const port = MAIL_PORT;
	const secure = encryption === 'ssl' || port === 465;

	transporter = nodemailer.createTransport({
		host,
		port,
		secure,
		auth: MAIL_USERNAME.trim()
			? { user: MAIL_USERNAME, pass: MAIL_PASSWORD }
			: undefined,
		...(encryption === 'tls' && !secure ? { requireTLS: true } : {})
	});

	return transporter;
}

/** Send a built email synchronously over SMTP. */
export async function sendMail(message: BuiltEmail): Promise<void> {
	const transport = getTransporter();
	await transport.sendMail({
		from: message.from,
		to: message.to,
		subject: message.subject,
		text: message.text,
		html: message.html
	});
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<BuiltEmail> {
	const message = buildVerificationEmail(input);
	await sendMail(message);
	return message;
}

export async function sendPasswordChangedEmail(
	input: PasswordChangedEmailInput
): Promise<BuiltEmail> {
	const message = buildPasswordChangedEmail(input);
	await sendMail(message);
	return message;
}

/** Test helper — clears the cached transporter. */
export function resetMailTransporter(): void {
	transporter = null;
}

function formatFrom(address: string, name: string): string {
	const trimmedName = name.trim();
	if (!trimmedName) return address;
	return `"${trimmedName.replace(/"/g, '')}" <${address}>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function escapeAttr(value: string): string {
	return escapeHtml(value).replaceAll("'", '&#39;');
}
