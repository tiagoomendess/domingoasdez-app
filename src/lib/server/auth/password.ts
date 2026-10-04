import { compare, hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

/** Verify a password against a Laravel bcrypt hash (`$2y$` / `$2a$` / `$2b$`). */
export async function verifyPassword(password: string, hashValue: string | null | undefined) {
	if (!hashValue) return false;
	const normalized = hashValue.startsWith('$2y$') ? `$2a$${hashValue.slice(4)}` : hashValue;
	try {
		return await compare(password, normalized);
	} catch {
		return false;
	}
}

/** Hash a password as Laravel does (bcrypt cost 10, `$2y$` prefix). */
export async function hashPassword(password: string): Promise<string> {
	const hashed = await hash(password, BCRYPT_ROUNDS);
	// bcryptjs may emit $2a$ or $2b$; Laravel stores $2y$.
	if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
		return `$2y$${hashed.slice(4)}`;
	}
	return hashed;
}
