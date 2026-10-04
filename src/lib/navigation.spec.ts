import { describe, expect, it } from 'vitest';
import { isTabSwitch } from './navigation.svelte.ts';

describe('isTabSwitch', () => {
	it('is a tab switch when the path moves to another tab root', () => {
		expect(isTabSwitch('/', '/jogos')).toBe(true);
		expect(isTabSwitch('/noticias/2026/01/01/titulo', '/')).toBe(true);
		expect(isTabSwitch('/competicoes/2025-26/honra', '/competicoes')).toBe(true);
	});

	it('ignores query-only updates on the current tab root', () => {
		expect(isTabSwitch('/jogos', '/jogos')).toBe(false);
		expect(isTabSwitch('/', '/')).toBe(false);
	});

	it('ignores navigations that are not landing on a tab root', () => {
		expect(isTabSwitch('/', '/noticias/2026/01/01/titulo')).toBe(false);
		expect(isTabSwitch('/clubes/carapecos', '/tecnicos/64/quim-ze')).toBe(false);
	});
});
