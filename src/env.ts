import { defineEnvVars } from '@sveltejs/kit/env';

function flag(defaultValue: boolean) {
	return (value: string | undefined) => {
		if (value === undefined || value === '') return defaultValue;
		return filter_var(value);
	};
}

function filter_var(value: string): boolean {
	const normalized = value.trim().toLowerCase();
	return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function optionalString(value: string | undefined) {
	if (value === undefined || value.trim() === '') return '';
	return value;
}

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string (legacy MySQL, read-only).' },
	MEDIA_BASE_URL: {
		description: 'Origin of the legacy site that serves media files (e.g. http://localhost:8000).'
	},
	LEGACY_BASE_URL: {
		description:
			'Origin of the legacy site for backoffice / score-report / flash-interview links. Falls back to MEDIA_BASE_URL when empty.',
		schema: optionalString
	},
	SESSION_SECRET: {
		description: 'HMAC secret for signed session cookies. Use a long random string in production.',
		schema: (value) => {
			const secret = optionalString(value);
			if (secret) return secret;
			return 'dev-only-session-secret-change-me!!';
		}
	},
	SOCIAL_LOGINS_ENABLED: {
		description: 'Master switch for social login buttons on /conta.',
		schema: flag(true)
	},
	GOOGLE_LOGIN_ENABLED: {
		description: 'Show the Google social login button when social logins are enabled.',
		schema: flag(true)
	},
	FACEBOOK_LOGIN_ENABLED: {
		description: 'Show the Facebook social login button when social logins are enabled.',
		schema: flag(false)
	},
	APPLE_LOGIN_ENABLED: {
		description: 'Show the Apple social login button when social logins are enabled.',
		schema: flag(false)
	},
	GOOGLE_CLIENT_ID: {
		description: 'Google OAuth client id for /conta/entrar/google.',
		schema: optionalString
	},
	GOOGLE_CLIENT_SECRET: {
		description: 'Google OAuth client secret for /conta/entrar/google.',
		schema: optionalString
	},
	GOOGLE_CLIENT_CALLBACK: {
		description:
			'Google OAuth redirect URI. Defaults to {origin}/conta/entrar/google/callback when empty.',
		schema: optionalString
	},
	RECAPTCHA_SITE_KEY: {
		description: 'Google reCAPTCHA v2 site key for guest score reports.',
		schema: optionalString,
		public: true
	},
	RECAPTCHA_SECRET_KEY: {
		description: 'Google reCAPTCHA v2 secret key for guest score reports.',
		schema: optionalString
	},
	RECAPTCHA_PUBLIC_KEY: {
		description: 'Legacy name for RECAPTCHA_SITE_KEY. Used when the site key above is empty.',
		schema: optionalString,
		public: true
	},
	RECAPTCHA_PRIVATE_KEY: {
		description: 'Legacy name for RECAPTCHA_SECRET_KEY. Used when the secret key above is empty.',
		schema: optionalString
	},
	MAIL_DRIVER: {
		description: 'Mail transport. Only "smtp" is supported (same as the legacy site).',
		schema: (value) => {
			const driver = optionalString(value).toLowerCase() || 'smtp';
			return driver;
		}
	},
	MAIL_HOST: {
		description: 'SMTP host (e.g. smtp.mailtrap.io).',
		schema: optionalString
	},
	MAIL_PORT: {
		description: 'SMTP port (e.g. 2525, 587, 465).',
		schema: (value) => {
			const raw = optionalString(value);
			if (!raw) return 2525;
			const port = Number(raw);
			return Number.isFinite(port) && port > 0 ? port : 2525;
		}
	},
	MAIL_USERNAME: {
		description: 'SMTP username.',
		schema: optionalString
	},
	MAIL_PASSWORD: {
		description: 'SMTP password.',
		schema: optionalString
	},
	MAIL_ENCRYPTION: {
		description: 'SMTP encryption: "tls", "ssl", or empty for none.',
		schema: optionalString
	},
	MAIL_FROM_ADDRESS: {
		description: 'From address for outbound mail (legacy site_email).',
		schema: (value) => optionalString(value) || 'geral@domingoasdez.com'
	},
	MAIL_FROM_NAME: {
		description: 'From display name for outbound mail (legacy site_name).',
		schema: (value) => optionalString(value) || 'Domingo às Dez'
	}
});
