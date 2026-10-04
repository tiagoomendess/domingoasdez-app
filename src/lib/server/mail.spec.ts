import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	MAIL_DRIVER: 'smtp',
	MAIL_HOST: 'smtp.example.test',
	MAIL_PORT: 2525,
	MAIL_USERNAME: '',
	MAIL_PASSWORD: '',
	MAIL_ENCRYPTION: '',
	MAIL_FROM_ADDRESS: 'geral@domingoasdez.com',
	MAIL_FROM_NAME: 'Domingo às Dez'
}));

describe('buildVerificationEmail', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('builds subject, from, verify URL and body with the expected CTA', async () => {
		const { buildVerificationEmail, buildVerifyUrl } = await import('./mail.ts');

		const verifyUrl = buildVerifyUrl(
			'http://localhost:5173',
			'ana@example.com',
			'AbCdEfGhIjKlMnOp'
		);
		expect(verifyUrl).toBe(
			'http://localhost:5173/conta/registar/verificar/ana%40example.com/AbCdEfGhIjKlMnOp'
		);

		const message = buildVerificationEmail({
			to: 'ana@example.com',
			verifyUrl,
			siteName: 'Domingo às Dez'
		});

		expect(message.from).toContain('geral@domingoasdez.com');
		expect(message.from).toContain('Domingo às Dez');
		expect(message.to).toBe('ana@example.com');
		expect(message.subject).toContain('Domingo às Dez');
		expect(message.verifyUrl).toBe(verifyUrl);
		expect(message.html).toContain(verifyUrl);
		expect(message.html).toMatch(/Verificar Email|Verify Email|Vérifier/i);
		expect(message.text).toContain(verifyUrl);
		expect(message.text).toMatch(/15/);
	});

	it('builds the password-changed notification with the account email', async () => {
		const { buildPasswordChangedEmail } = await import('./mail.ts');
		const message = buildPasswordChangedEmail({
			to: 'ana@example.com',
			name: 'Ana',
			email: 'ana@example.com',
			siteName: 'Domingo às Dez'
		});

		expect(message.subject).toContain('Domingo às Dez');
		expect(message.text).toContain('ana@example.com');
		expect(message.text).toContain('Ana');
		expect(message.html).toContain('ana@example.com');
	});
});
