import { compare } from 'bcryptjs';

/** Verify a password against a Laravel bcrypt hash (`$2y$` / `$2a$` / `$2b$`). */
export async function verifyPassword(password: string, hash: string | null | undefined) {
	if (!hash) return false;
	const normalized = hash.startsWith('$2y$') ? `$2a$${hash.slice(4)}` : hash;
	try {
		return await compare(password, normalized);
	} catch {
		return false;
	}
}
