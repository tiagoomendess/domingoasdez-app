import { GOOGLE_CLIENT_CALLBACK, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$app/env/private';
import {
	findEmailAccount,
	findUserBySocialLink,
	linkSocialProvider,
	markUserVerified,
	type AuthUser
} from '#lib/server/auth/users.ts';

export type GoogleIdentity = {
	id: string;
	email: string | null;
	emailVerified: boolean;
	name: string | null;
};

export function isGoogleConfigured() {
	return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(fallbackOrigin: string) {
	if (GOOGLE_CLIENT_CALLBACK) return GOOGLE_CLIENT_CALLBACK;
	return `${fallbackOrigin.replace(/\/$/, '')}/conta/entrar/google/callback`;
}

export function googleAuthorizationUrl(state: string, redirectUri: string) {
	const query = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'online',
		include_granted_scopes: 'true',
		prompt: 'select_account'
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

export async function fetchGoogleIdentity(
	code: string,
	redirectUri: string
): Promise<GoogleIdentity> {
	const body = new URLSearchParams({
		code,
		client_id: GOOGLE_CLIENT_ID,
		client_secret: GOOGLE_CLIENT_SECRET,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code'
	});

	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!tokenRes.ok) throw new Error('token');
	const token = (await tokenRes.json()) as { access_token?: string };
	if (!token.access_token) throw new Error('token');

	let userRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
		headers: { Authorization: `Bearer ${token.access_token}` }
	});
	if (!userRes.ok) {
		userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${token.access_token}` }
		});
	}
	if (!userRes.ok) throw new Error('userinfo');

	const user = (await userRes.json()) as Record<string, unknown>;
	const id = user.id ?? user.sub;
	if (typeof id !== 'string' && typeof id !== 'number') throw new Error('userinfo');

	const email = typeof user.email === 'string' ? user.email : null;
	const name = typeof user.name === 'string' ? user.name : null;
	const verified = user.verified_email ?? user.email_verified ?? false;

	return {
		id: String(id),
		email,
		emailVerified: verified === true || verified === 1 || verified === 'true',
		name
	};
}

export type SocialLoginResult =
	| { ok: true; user: AuthUser }
	| { ok: false; reason: 'missing_email' | 'unverified_email' | 'no_account' | 'banned' | 'error' };

/**
 * Resolve Google identity to an existing account only (no registration).
 * Mirrors legacy AccountDecision, but CREATE becomes no_account.
 */
export async function resolveExistingSocialUser(
	provider: 'google',
	identity: GoogleIdentity
): Promise<SocialLoginResult> {
	const linked = await findUserBySocialLink(provider, identity.id);
	if (linked) return { ok: true, user: linked };

	const email = identity.email?.trim().toLowerCase() || null;
	if (!email) return { ok: false, reason: 'missing_email' };
	if (!identity.emailVerified) return { ok: false, reason: 'unverified_email' };

	const account = await findEmailAccount(email);
	if (!account) return { ok: false, reason: 'no_account' };

	try {
		await linkSocialProvider(account.user.id, provider, identity.id);
		if (!account.verified) await markUserVerified(account.user.id);
		return { ok: true, user: account.user };
	} catch {
		return { ok: false, reason: 'error' };
	}
}
