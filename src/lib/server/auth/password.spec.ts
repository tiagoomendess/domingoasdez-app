import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.ts';

describe('verifyPassword', () => {
	it('accepts a known bcrypt hash (Laravel $2y$)', async () => {
		// bcrypt of "password" with cost 10
		const hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
		expect(await verifyPassword('password', hash)).toBe(true);
		expect(await verifyPassword('wrong', hash)).toBe(false);
	});

	it('rejects empty hashes', async () => {
		expect(await verifyPassword('password', null)).toBe(false);
		expect(await verifyPassword('password', '')).toBe(false);
	});
});

describe('hashPassword', () => {
	it('produces a $2y$ hash that verifyPassword accepts', async () => {
		const hashed = await hashPassword('secret12');
		expect(hashed.startsWith('$2y$')).toBe(true);
		expect(await verifyPassword('secret12', hashed)).toBe(true);
		expect(await verifyPassword('wrong', hashed)).toBe(false);
	});

	it('accepts the legacy minimum length of 6 characters', async () => {
		const hashed = await hashPassword('abcdef');
		expect(await verifyPassword('abcdef', hashed)).toBe(true);
	});
});
