import { describe, expect, it } from 'vitest';
import {
	agentTypeRank,
	clubHref,
	mergeClubTransfers,
	playerHref,
	teamAgentHref,
	type TransferRef
} from './clubs.ts';

describe('href builders', () => {
	it('builds club, player and team-agent URLs', () => {
		expect(clubHref('Vitória Sport Clube')).toBe('/clubes/vitoria-sport-clube');
		expect(playerHref(42, 'João Silva')).toBe('/jogadores/42/joao-silva');
		expect(teamAgentHref(7, 'António Costa')).toBe('/tecnicos/7/antonio-costa');
	});
});

describe('agentTypeRank', () => {
	it('orders manager → assistant → GK → director → other', () => {
		expect(agentTypeRank('manager')).toBe(1);
		expect(agentTypeRank('assistant_manager')).toBe(2);
		expect(agentTypeRank('goalkeeper_manager')).toBe(3);
		expect(agentTypeRank('director')).toBe(4);
		expect(agentTypeRank('physio')).toBe(5);
	});
});

function t(partial: TransferRef): TransferRef {
	return partial;
}

describe('mergeClubTransfers', () => {
	it('includes outgoing next transfers and sorts newest first', () => {
		const incoming = [
			t({ id: 1, playerId: 10, date: '2024-01-01 00:00:00' }),
			t({ id: 2, playerId: 20, date: '2024-06-01 00:00:00' })
		];
		const history = [
			t({ id: 1, playerId: 10, date: '2024-01-01 00:00:00' }),
			t({ id: 3, playerId: 10, date: '2024-08-01 00:00:00' }),
			t({ id: 2, playerId: 20, date: '2024-06-01 00:00:00' })
		];

		const merged = mergeClubTransfers(incoming, history);
		expect(merged.map((x) => x.id)).toEqual([3, 2, 1]);
	});

	it('merges transfers from every team (fixes last-team-only bug)', () => {
		const incoming = [
			t({ id: 1, playerId: 1, date: '2023-01-01 00:00:00' }),
			t({ id: 2, playerId: 2, date: '2024-01-01 00:00:00' }),
			t({ id: 3, playerId: 3, date: '2025-01-01 00:00:00' })
		];
		const merged = mergeClubTransfers(incoming, incoming);
		expect(merged.map((x) => x.id)).toEqual([3, 2, 1]);
	});

	it('deduplicates by id when a next transfer is also incoming', () => {
		const incoming = [
			t({ id: 1, playerId: 10, date: '2024-01-01 00:00:00' }),
			t({ id: 2, playerId: 10, date: '2024-06-01 00:00:00' })
		];
		const history = incoming;
		const merged = mergeClubTransfers(incoming, history);
		expect(merged.map((x) => x.id)).toEqual([2, 1]);
	});

	it('respects the limit', () => {
		const incoming = Array.from({ length: 30 }, (_, i) =>
			t({
				id: i + 1,
				playerId: i + 1,
				date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01 00:00:00`
			})
		);
		expect(mergeClubTransfers(incoming, incoming, 18)).toHaveLength(18);
	});

	it('picks the earliest next transfer after the incoming date', () => {
		const incoming = [t({ id: 1, playerId: 10, date: '2024-01-01 00:00:00' })];
		const history = [
			t({ id: 1, playerId: 10, date: '2024-01-01 00:00:00' }),
			t({ id: 5, playerId: 10, date: '2024-12-01 00:00:00' }),
			t({ id: 4, playerId: 10, date: '2024-03-01 00:00:00' })
		];
		const merged = mergeClubTransfers(incoming, history);
		expect(merged.map((x) => x.id)).toEqual([4, 1]);
	});

	it('returns empty when there are no incoming transfers', () => {
		expect(mergeClubTransfers([], [])).toEqual([]);
	});
});
