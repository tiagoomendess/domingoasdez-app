/**
 * Pure player display helpers (ports Player::firstAndLastName / displayName / getAge).
 */

export type PlayerPosition = 'none' | 'striker' | 'midfielder' | 'defender' | 'goalkeeper';

/** Guests see this many transfers on the player detail page (legacy login wall). */
export const GUEST_TRANSFER_LIMIT = 2;

/** Truncate a newest-first transfer list for guests; logged-in users see everything. */
export function limitTransfers<T>(
	list: T[],
	isGuest: boolean
): { shown: T[]; remaining: number } {
	if (!isGuest || list.length <= GUEST_TRANSFER_LIMIT) {
		return { shown: list, remaining: 0 };
	}
	return {
		shown: list.slice(0, GUEST_TRANSFER_LIMIT),
		remaining: list.length - GUEST_TRANSFER_LIMIT
	};
}

/** First + last token of a full name (or the whole string if fewer than 2 parts). */
export function firstAndLastName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return '';
	const parts = trimmed.split(/\s+/);
	if (parts.length < 2) return trimmed;
	return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** Ports Player::displayName — `First Last` or `First Last (nickname)`. */
export function playerDisplayName(fullName: string, nickname?: string | null): string {
	const base = firstAndLastName(fullName);
	const nick = nickname?.trim();
	if (nick) return `${base} (${nick})`;
	return base;
}

/**
 * Age in full years from a birth date (ISO or MySQL datetime / Date).
 * Returns null when birth date is missing or invalid.
 */
export function playerAge(
	birthDate: string | Date | null | undefined,
	now = new Date()
): number | null {
	if (birthDate == null) return null;
	const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
	if (Number.isNaN(birth.getTime())) return null;

	let age = now.getUTCFullYear() - birth.getUTCFullYear();
	if (
		now.getUTCMonth() < birth.getUTCMonth() ||
		(now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
	) {
		age--;
	}
	return age;
}

/** True when the player is 18+ (ports age-safe picture gate). */
export function isAdult(birthDate: string | Date | null | undefined, now = new Date()): boolean {
	const age = playerAge(birthDate, now);
	return age != null && age >= 18;
}
