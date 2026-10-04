import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
	it('folds Portuguese diacritics', () => {
		expect(slugify('Campeonato de São João')).toBe('campeonato-de-sao-joao');
		expect(slugify('Vitória já é certa')).toBe('vitoria-ja-e-certa');
		expect(slugify('Açores — âncora')).toBe('acores-ancora');
	});

	it('folds ordinal indicators like Laravel', () => {
		expect(slugify('1ª Divisão AFPB')).toBe('1a-divisao-afpb');
		expect(slugify('2º Escalão')).toBe('2o-escalao');
	});

	it('collapses punctuation and spaces', () => {
		expect(slugify('  Hello, World!  ')).toBe('hello-world');
		expect(slugify('foo---bar')).toBe('foo-bar');
	});

	it('matches Laravel-style article titles', () => {
		expect(slugify('FC Porto vence 2-1 em casa')).toBe('fc-porto-vence-2-1-em-casa');
	});
});
