import { describe, expect, it } from 'vitest';
import { generateEmailToken, validateRegistrationFields } from './register.ts';

describe('validateRegistrationFields', () => {
	const valid = {
		name: 'Ana Silva',
		email: 'ana@example.com',
		password: 'secret1',
		passwordConfirmation: 'secret1',
		terms: true,
		rgpd: true
	};

	it('accepts a valid payload', () => {
		expect(validateRegistrationFields(valid)).toEqual({});
	});

	it('requires name, email, password, terms and rgpd', () => {
		expect(
			validateRegistrationFields({
				name: '',
				email: '',
				password: '',
				passwordConfirmation: '',
				terms: false,
				rgpd: false
			})
		).toEqual({
			name: 'required',
			email: 'required',
			password: 'required',
			terms: 'required',
			rgpd: 'required'
		});
	});

	it('rejects short passwords and mismatched confirmation', () => {
		expect(
			validateRegistrationFields({
				...valid,
				password: '12345',
				passwordConfirmation: 'other'
			})
		).toEqual({
			password: 'min',
			password_confirmation: 'mismatch'
		});
	});

	it('rejects invalid and oversized emails', () => {
		expect(validateRegistrationFields({ ...valid, email: 'not-an-email' })).toEqual({
			email: 'invalid'
		});
		expect(validateRegistrationFields({ ...valid, email: `${'a'.repeat(150)}@x.com` })).toEqual({
			email: 'max'
		});
	});

	it('rejects oversized names', () => {
		expect(validateRegistrationFields({ ...valid, name: 'n'.repeat(156) })).toEqual({
			name: 'max'
		});
	});
});

describe('generateEmailToken', () => {
	it('returns 16 alphanumeric characters like Laravel str_random', () => {
		const token = generateEmailToken(16);
		expect(token).toHaveLength(16);
		expect(token).toMatch(/^[A-Za-z0-9]+$/);
	});
});
