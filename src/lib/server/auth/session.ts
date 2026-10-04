import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { SESSION_SECRET } from '$app/env/private';

export const SESSION_COOKIE = 'dad_session';

const DAY = 86_400;
const DEFAULT_MAX_AGE = 30 * DAY;
const REMEMBER_MAX_AGE = 365 * DAY;

type SessionPayload = {
	u: number;
	e: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string) {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/');
	const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
	const binary = atob(padded + pad);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function sign(payload: string) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(SESSION_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return bytesToBase64Url(new Uint8Array(signature));
}

async function verify(payload: string, signature: string) {
	const expected = await sign(payload);
	if (expected.length !== signature.length) return false;
	let mismatch = 0;
	for (let i = 0; i < expected.length; i++)
		mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	return mismatch === 0;
}

export async function createSessionToken(userId: number, maxAgeSeconds = DEFAULT_MAX_AGE) {
	const payload: SessionPayload = {
		u: userId,
		e: Math.floor(Date.now() / 1000) + maxAgeSeconds
	};
	const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
	const signature = await sign(encoded);
	return `${encoded}.${signature}`;
}

export async function readSessionUserId(token: string | undefined): Promise<number | null> {
	if (!token) return null;
	const [encoded, signature] = token.split('.');
	if (!encoded || !signature) return null;
	if (!(await verify(encoded, signature))) return null;

	try {
		const payload = JSON.parse(
			new TextDecoder().decode(base64UrlToBytes(encoded))
		) as SessionPayload;
		if (!payload?.u || !payload?.e || payload.e < Math.floor(Date.now() / 1000)) return null;
		return payload.u;
	} catch {
		return null;
	}
}

export async function setSessionCookie(cookies: Cookies, userId: number, remember = false) {
	const maxAge = remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE;
	const token = await createSessionToken(userId, maxAge);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
