import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));

const { liveSmallName } = await import('./live.ts');

/** [club name, *_club_name_small] produced by the legacy GamesController@getLiveMatches code (PHP 7.4). */
const LEGACY_SMALL_NAMES: [string, string][] = [
	['Águias de Alvelos', 'ALV'],
	['Clube Águia', '?GU'],
	['Ucha', 'UCH'],
	['GD Apúlia', 'GD'],
	['FC Lírio do Neiva', 'NEI'],
	['Ançã FC', 'ANç'],
	['Gião', 'GIã'],
	['AD Ordem', 'ORD'],
	['Os Torreenses', 'TOR'],
	['ADC Balasar', 'BAL'],
	['Vila Fria 1980', 'VIL'],
	['Rebordões Santa Maria', 'MAR'],
	['Celeirós', 'CEL'],
	['abc', 'ABC'],
	['X', 'X'],
	['Árvore', '?RV'],
	['São Paio', 'PAI'],
	['Lamaçães', 'LAM'],
	['Pousa', 'POU'],
	['S. Pedro de Rates', 'RAT'],
	['UDR', 'UDR'],
	['Á', 'Á'],
	['ÁÁ', 'ÁÁ'],
	['Clube Ánimo', '?NI'],
	['Clube Ç', 'CLU'],
	['Fão', 'FãO'],
	['Vila Seca', 'SEC'],
	['Alvito São Pedro', 'PED'],
	['Pedra Furada', 'FUR']
];

describe('liveSmallName', () => {
	it.each(LEGACY_SMALL_NAMES)('%s gives %s, like PHP', (name, small) => {
		expect(liveSmallName(name)).toBe(small);
	});

	it('replaces a stray byte instead of producing invalid UTF-8 (legacy then failed with a 500)', () => {
		expect(liveSmallName('Clube Áa')).toBe('?A');
	});
});
