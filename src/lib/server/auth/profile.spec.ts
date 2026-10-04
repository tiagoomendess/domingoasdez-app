import { describe, expect, it } from 'vitest';
import { validatePasswordChangeFields, validateProfileFields } from './profile.ts';

describe('validateProfileFields', () => {
	it('accepts empty phone and bio', () => {
		expect(validateProfileFields({ phone: '', bio: '' })).toEqual({});
		expect(validateProfileFields({ phone: '  ', bio: '  ' })).toEqual({});
	});

	it('accepts valid phone and bio', () => {
		expect(validateProfileFields({ phone: '912345678', bio: 'Olá mundo' })).toEqual({});
	});

	it('rejects phone outside 6–14 characters', () => {
		expect(validateProfileFields({ phone: '12345', bio: '' })).toEqual({ phone: 'min' });
		expect(validateProfileFields({ phone: '1'.repeat(15), bio: '' })).toEqual({ phone: 'max' });
	});

	it('rejects bio outside 3–500 characters', () => {
		expect(validateProfileFields({ phone: '', bio: 'ab' })).toEqual({ bio: 'min' });
		expect(validateProfileFields({ phone: '', bio: 'x'.repeat(501) })).toEqual({ bio: 'max' });
	});
});

describe('validatePasswordChangeFields', () => {
	const valid = {
		currentPassword: 'secret1',
		newPassword: 'secret2',
		newPasswordConfirmation: 'secret2'
	};

	it('accepts a valid payload', () => {
		expect(validatePasswordChangeFields(valid)).toEqual({});
	});

	it('requires current and new password with length bounds', () => {
		expect(
			validatePasswordChangeFields({
				currentPassword: '',
				newPassword: '12345',
				newPasswordConfirmation: '12345'
			})
		).toEqual({
			password_atual: 'required',
			nova_password: 'min'
		});
	});

	it('rejects mismatched confirmation', () => {
		expect(
			validatePasswordChangeFields({
				...valid,
				newPasswordConfirmation: 'other'
			})
		).toEqual({ nova_password_confirmation: 'mismatch' });
	});
});
