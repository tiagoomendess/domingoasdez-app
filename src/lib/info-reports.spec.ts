import { describe, expect, it } from 'vitest';
import {
	generateInfoCode,
	isValidInfoCode,
	normalizeInfoCode,
	validateInfoReport
} from './info-reports.ts';

describe('normalizeInfoCode / isValidInfoCode', () => {
	it('uppercases and trims', () => {
		expect(normalizeInfoCode('  abc123def ')).toBe('ABC123DEF');
		expect(isValidInfoCode(normalizeInfoCode('abc123def'))).toBe(true);
	});

	it('rejects wrong lengths and symbols', () => {
		expect(isValidInfoCode('ABC123')).toBe(false);
		expect(isValidInfoCode('ABC123DEFGH')).toBe(false);
		expect(isValidInfoCode('ABC-123DE')).toBe(false);
		expect(isValidInfoCode('')).toBe(false);
	});
});

describe('validateInfoReport', () => {
	it('accepts content 10–500 and source 5–155', () => {
		expect(validateInfoReport('0123456789', 'Fonte X').ok).toBe(true);
		expect(validateInfoReport('x'.repeat(500), 'y'.repeat(155)).ok).toBe(true);
	});

	it('rejects short or long fields', () => {
		expect(validateInfoReport('short', 'Fonte válida')).toEqual({
			ok: false,
			error: 'content'
		});
		expect(validateInfoReport('Conteúdo válido aqui', 'abc')).toEqual({
			ok: false,
			error: 'source'
		});
		expect(validateInfoReport('x'.repeat(501), 'Fonte válida')).toEqual({
			ok: false,
			error: 'content'
		});
	});

	it('trims before measuring', () => {
		expect(validateInfoReport('   0123456789   ', '  Fonte X  ')).toEqual({
			ok: true,
			content: '0123456789',
			source: 'Fonte X'
		});
	});
});

describe('generateInfoCode', () => {
	it('generates 9 uppercase alphanumerics', () => {
		const code = generateInfoCode();
		expect(code).toMatch(/^[A-Z0-9]{9}$/);
		expect(code.length).toBe(9);
	});
});
