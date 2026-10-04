import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { userProfiles, users } from '#lib/server/db/schema.ts';
import { hashPassword, verifyPassword } from '#lib/server/auth/password.ts';
import { sendPasswordChangedEmail } from '#lib/server/mail.ts';
import { m } from '#lib/messages.ts';

export type ProfileDetails = {
	name: string;
	email: string;
	phone: string;
	bio: string;
	/** MySQL datetime / ISO string from `users.created_at`. */
	memberSince: string | null;
	hasPassword: boolean;
};

export type ProfileUpdateInput = { phone: string; bio: string };
export type ProfileUpdateResult =
	| { ok: true }
	| { ok: false; errors: { phone?: string; bio?: string; form?: string } };

export type ChangePasswordInput = {
	currentPassword: string;
	newPassword: string;
	newPasswordConfirmation: string;
};
export type ChangePasswordResult =
	| { ok: true }
	| {
			ok: false;
			errors: {
				password_atual?: string;
				nova_password?: string;
				nova_password_confirmation?: string;
				form?: string;
			};
	  };

export type ProfileFieldErrors = {
	phone?: 'min' | 'max';
	bio?: 'min' | 'max';
};

/** Pure field validation matching legacy `updateProfileInfo` rules. */
export function validateProfileFields(input: ProfileUpdateInput): ProfileFieldErrors {
	const errors: ProfileFieldErrors = {};
	const phone = input.phone.trim();
	const bio = input.bio.trim();

	if (phone) {
		if (phone.length < 6) errors.phone = 'min';
		else if (phone.length > 14) errors.phone = 'max';
	}

	if (bio) {
		if (bio.length < 3) errors.bio = 'min';
		else if (bio.length > 500) errors.bio = 'max';
	}

	return errors;
}

export type PasswordFieldErrors = {
	password_atual?: 'required' | 'min' | 'max';
	nova_password?: 'required' | 'min' | 'max';
	nova_password_confirmation?: 'mismatch';
};

/** Pure field validation matching legacy `changePassword` rules (before DB checks). */
export function validatePasswordChangeFields(input: ChangePasswordInput): PasswordFieldErrors {
	const errors: PasswordFieldErrors = {};
	const current = input.currentPassword;
	const next = input.newPassword;

	if (!current) errors.password_atual = 'required';
	else if (current.length < 6) errors.password_atual = 'min';
	else if (current.length > 50) errors.password_atual = 'max';

	if (!next) errors.nova_password = 'required';
	else if (next.length < 6) errors.nova_password = 'min';
	else if (next.length > 50) errors.nova_password = 'max';

	if (next !== input.newPasswordConfirmation) {
		errors.nova_password_confirmation = 'mismatch';
	}

	return errors;
}

export async function getProfileDetails(userId: number): Promise<ProfileDetails | null> {
	const [row] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			password: users.password,
			createdAt: users.createdAt,
			phone: userProfiles.phone,
			bio: userProfiles.bio
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(eq(users.id, userId))
		.limit(1);

	if (!row || !row.email) return null;

	return {
		name: row.name?.trim() || row.email.split('@')[0] || 'Utilizador',
		email: row.email,
		phone: row.phone?.trim() ?? '',
		bio: row.bio?.trim() ?? '',
		memberSince: toMemberSince(row.createdAt),
		hasPassword: Boolean(row.password)
	};
}

export async function userHasPassword(userId: number): Promise<boolean> {
	const [row] = await db
		.select({ password: users.password })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	return Boolean(row?.password);
}

export async function updateProfile(
	userId: number,
	input: ProfileUpdateInput
): Promise<ProfileUpdateResult> {
	const phone = input.phone.trim();
	const bio = input.bio.trim();

	const fieldErrors = validateProfileFields({ phone, bio });
	const errors: { phone?: string; bio?: string; form?: string } = {};
	if (fieldErrors.phone) errors.phone = m.profile_error_phone();
	if (fieldErrors.bio) errors.bio = m.profile_error_bio();
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const phoneValue = phone || null;
	const bioValue = bio || null;
	const now = new Date();

	try {
		const [existing] = await db
			.select({ id: userProfiles.id })
			.from(userProfiles)
			.where(eq(userProfiles.userId, userId))
			.limit(1);

		if (existing) {
			await db
				.update(userProfiles)
				.set({
					phone: phoneValue,
					bio: bioValue,
					updatedAt: now
				})
				.where(eq(userProfiles.userId, userId));
		} else {
			await db.insert(userProfiles).values({
				userId,
				phone: phoneValue,
				bio: bioValue,
				createdAt: now,
				updatedAt: now
			});
		}

		return { ok: true };
	} catch (err) {
		console.error('updateProfile failed', err);
		return { ok: false, errors: { form: m.profile_error_form() } };
	}
}

export async function changePassword(
	userId: number,
	input: ChangePasswordInput
): Promise<ChangePasswordResult> {
	const fieldErrors = validatePasswordChangeFields(input);
	const errors: {
		password_atual?: string;
		nova_password?: string;
		nova_password_confirmation?: string;
		form?: string;
	} = {};

	if (fieldErrors.password_atual) errors.password_atual = m.password_change_error_current();
	if (fieldErrors.nova_password) errors.nova_password = m.password_change_error_new();
	if (fieldErrors.nova_password_confirmation) {
		errors.nova_password_confirmation = m.password_change_error_confirm();
	}
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const [row] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			password: users.password
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!row) return { ok: false, errors: { form: m.password_change_error_form() } };

	if (!row.password) {
		return { ok: false, errors: { form: m.password_change_error_social() } };
	}

	const currentOk = await verifyPassword(input.currentPassword, row.password);
	if (!currentOk) {
		return { ok: false, errors: { password_atual: m.password_change_error_current() } };
	}

	if (input.currentPassword === input.newPassword) {
		return { ok: false, errors: { nova_password: m.password_change_error_same() } };
	}

	if (!row.email) {
		return { ok: false, errors: { form: m.password_change_error_form() } };
	}

	try {
		const hashed = await hashPassword(input.newPassword);
		await db
			.update(users)
			.set({ password: hashed, updatedAt: new Date() })
			.where(eq(users.id, userId));

		const displayName = row.name?.trim() || row.email.split('@')[0] || 'Utilizador';
		try {
			await sendPasswordChangedEmail({
				to: row.email,
				name: displayName,
				email: row.email
			});
		} catch (mailErr) {
			console.error('password changed email failed', mailErr);
		}

		return { ok: true };
	} catch (err) {
		console.error('changePassword failed', err);
		return { ok: false, errors: { form: m.password_change_error_form() } };
	}
}

function toMemberSince(value: unknown): string | null {
	if (value == null) return null;
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return null;
		return value.toISOString();
	}
	const raw = String(value).trim();
	return raw && !raw.startsWith('0000-00-00') ? raw : null;
}
