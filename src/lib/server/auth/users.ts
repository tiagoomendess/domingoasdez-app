import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { socialProviders, userBans, userProfiles, users } from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { verifyPassword } from '#lib/server/auth/password.ts';
import type { AuthUser } from '#lib/auth/user.ts';

export type { AuthUser };
export async function isUserBanned(userId: number) {
	const [ban] = await db
		.select({ id: userBans.id })
		.from(userBans)
		.where(and(eq(userBans.bannedUserId, userId), eq(userBans.pardoned, false)))
		.limit(1);
	return !!ban;
}

async function toAuthUser(row: {
	id: number;
	name: string | null;
	email: string | null;
	picture: string | null;
}): Promise<AuthUser | null> {
	if (!row.email) return null;
	return {
		id: row.id,
		name: row.name?.trim() || row.email.split('@')[0] || 'Utilizador',
		email: row.email,
		picture: mediaUrl(row.picture)
	};
}

export async function getAuthUserById(userId: number): Promise<AuthUser | null> {
	const [row] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			verified: users.verified,
			picture: userProfiles.picture
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(eq(users.id, userId))
		.limit(1);

	if (!row || !row.verified) return null;
	if (await isUserBanned(row.id)) return null;
	return toAuthUser(row);
}

export type LoginResult =
	{ ok: true; user: AuthUser } | { ok: false; reason: 'invalid' | 'throttled' };

export async function attemptPasswordLogin(email: string, password: string): Promise<LoginResult> {
	const normalized = email.trim().toLowerCase();
	if (!normalized || !password) return { ok: false, reason: 'invalid' };

	const [row] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			password: users.password,
			verified: users.verified,
			picture: userProfiles.picture
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(sql`LOWER(${users.email}) = ${normalized}`)
		.limit(1);

	// Same opaque failure as the legacy site for missing / unverified / banned / wrong password.
	if (!row || !row.verified || (await isUserBanned(row.id))) {
		return { ok: false, reason: 'invalid' };
	}

	const matches = await verifyPassword(password, row.password);
	if (!matches) return { ok: false, reason: 'invalid' };

	const user = await toAuthUser(row);
	if (!user) return { ok: false, reason: 'invalid' };
	return { ok: true, user };
}

export async function findUserBySocialLink(provider: string, providerId: string) {
	const [row] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			verified: users.verified,
			picture: userProfiles.picture
		})
		.from(socialProviders)
		.innerJoin(users, eq(users.id, socialProviders.userId))
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(
			and(
				sql`LOWER(${socialProviders.provider}) = ${provider.toLowerCase()}`,
				eq(socialProviders.providerId, providerId)
			)
		)
		.limit(1);

	if (!row) return null;
	if (!row.verified || (await isUserBanned(row.id))) return null;
	return toAuthUser(row);
}

export async function findEmailAccount(email: string) {
	const normalized = email.trim().toLowerCase();
	const [row] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			verified: users.verified,
			picture: userProfiles.picture
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(sql`LOWER(${users.email}) = ${normalized}`)
		.limit(1);

	if (!row || !row.email || (await isUserBanned(row.id))) return null;

	return {
		user: {
			id: row.id,
			name: row.name?.trim() || row.email.split('@')[0] || 'Utilizador',
			email: row.email,
			picture: mediaUrl(row.picture)
		} satisfies AuthUser,
		verified: row.verified
	};
}

export async function linkSocialProvider(userId: number, provider: string, providerId: string) {
	const existing = await findUserBySocialLink(provider, providerId);
	if (existing) {
		if (existing.id !== userId) throw new Error('provider_taken');
		return;
	}

	await db.insert(socialProviders).values({
		userId,
		provider: provider.toLowerCase(),
		providerId
	});
}

export async function markUserVerified(userId: number) {
	await db.update(users).set({ verified: true }).where(eq(users.id, userId));
}
