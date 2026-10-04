import { describe, expect, it } from 'vitest';
import { verifyPassword } from './password.ts';

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
