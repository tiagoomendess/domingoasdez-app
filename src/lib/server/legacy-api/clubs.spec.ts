import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));

const { calculateMatchScore, getWords, normalizeString } = await import('./clubs.ts');

/** [club, search term, score] computed by the legacy ClubsController::calculateMatchScore (PHP 7.4). */
const LEGACY_SCORES: [string, string, number][] = [
	['GDR Campo', 'GDR Campo', 1],
	['GDR Campo', 'gdr campo', 1],
	['Águias de Alvelos', 'aguias de alvelos', 1],
	['Águias de Alvelos', 'Águias', 0.28235294117647064],
	['S. Martinho', 'Associação S. Martinho', 0.45],
	['Silva', 'Nucleo Desportivo da Silva', 0.1730769230769231],
	['Nucleo Desportivo da Silva', 'Silva', 0.15384615384615385],
	['Grupo Desportivo de Gião', 'Gião FC', 0.2333333333333333],
	['Grupo Desportivo de Gião', 'Giao', 0.13333333333333333],
	['Clube Desportivo Encourados', 'Encorados', 0.19999999999999998],
	['1ª Divisão FC', '1a divisao', 0.2333333333333333],
	['ADC Lijó', 'Lijo', 0.4],
	['Futebol Clube Roriz', 'Roris', 0.19999999999999998],
	['Vila Frescainha S. Pedro', 'Frescainha', 0.33333333333333337],
	['Vila Frescainha S. Pedro', 'Pedro S Vila', 0.35],
	['Ucha', 'Uxa', 0],
	['Tamel', 'Tamelense', 0.5],
	['Oliveira', 'Olivais', 0.6],
	['Martim', 'Martinho', 0.6],
	['Abc', 'xyz', 0],
	['Arcozelo', 'Arcozelo B', 0.7200000000000001],
	['0 Clube', '0', 0.11428571428571428],
	['Ançã', 'anca', 1],
	['Viatodos', 'Via todos', 0.3],
	['Cossourado', 'Cosourado', 0.6],
	['Durrães', 'Durraes FC', 0.63]
];

describe('calculateMatchScore', () => {
	it.each(LEGACY_SCORES)('%s vs %s scores like PHP', (club, term, score) => {
		expect(calculateMatchScore(club, term)).toBe(score);
	});
});

describe('normalizeString', () => {
	it('folds accents and lowercases ASCII', () => {
		expect(normalizeString('Águias ÇÃO ß')).toBe('aguias cao ss');
	});

	it('leaves characters outside the map alone', () => {
		expect(normalizeString('1ª Ğ')).toBe('1ª Ğ');
	});
});

describe('getWords', () => {
	it('drops stop words and "0"', () => {
		expect(getWords('grupo  desportivo de 0 giao')).toEqual(['grupo', 'desportivo', 'giao']);
	});
});
