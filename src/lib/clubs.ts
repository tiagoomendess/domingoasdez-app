/**
 * Pure club-page helpers (hrefs, agent ordering, transfer merge).
 */
import { firstAndLastName } from '#lib/players.ts';
import { slugify } from '#lib/slug.ts';

export type AgentType =
	'manager' | 'assistant_manager' | 'goalkeeper_manager' | 'director' | (string & {});

export type TransferRef = {
	id: number;
	playerId: number;
	/** ISO-8601 or MySQL datetime — compared lexicographically when same format. */
	date: string;
};

export function clubHref(clubName: string): string {
	return `/clubes/${slugify(clubName)}`;
}

export function playerHref(id: number, name: string): string {
	return `/jogadores/${id}/${slugify(name)}`;
}

export function teamAgentHref(id: number, name: string): string {
	return `/tecnicos/${id}/${slugify(name)}`;
}

/**
 * Staff label on the club page. Drops a quoted or parenthetical nickname,
 * then keeps the first and last name so a long legal name cannot widen the page.
 */
export function agentListName(fullName: string): string {
	const withoutNick = fullName
		.replace(/\s*\([^)]*\)/g, ' ')
		.replace(/\s*"[^"]*"/g, ' ')
		.replace(/\s*“[^”]*”/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return firstAndLastName(withoutNick || fullName.trim());
}

/**
 * Ports the SQL CASE order used for technical staff on the club page:
 * manager → assistant_manager → goalkeeper_manager → director → other.
 */
export function agentTypeRank(type: AgentType): number {
	switch (type) {
		case 'manager':
			return 1;
		case 'assistant_manager':
			return 2;
		case 'goalkeeper_manager':
			return 3;
		case 'director':
			return 4;
		default:
			return 5;
	}
}

/**
 * For each transfer into a club's teams, include that transfer plus the player's
 * *next* transfer after that date (if any). Deduplicate by id, newest first, limit.
 * Fixes the legacy controller bug that only kept the last team's transfers.
 */
export function mergeClubTransfers(
	incoming: TransferRef[],
	playerHistory: TransferRef[],
	limit = 18
): TransferRef[] {
	const byPlayer = new Map<number, TransferRef[]>();
	for (const transfer of playerHistory) {
		const list = byPlayer.get(transfer.playerId);
		if (list) list.push(transfer);
		else byPlayer.set(transfer.playerId, [transfer]);
	}
	for (const list of byPlayer.values()) {
		list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
	}

	const merged = new Map<number, TransferRef>();

	for (const transfer of incoming) {
		merged.set(transfer.id, transfer);

		const history = byPlayer.get(transfer.playerId) ?? [];
		const next = history.find((t) => t.date > transfer.date);
		if (next) merged.set(next.id, next);
	}

	return [...merged.values()]
		.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : b.id - a.id))
		.slice(0, limit);
}
