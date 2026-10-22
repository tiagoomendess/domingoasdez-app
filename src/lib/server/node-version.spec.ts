import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	MIN_NODE_VERSION,
	assertSupportedNodeVersion,
	isSupportedNodeVersion
} from './node-version.ts';

describe('isSupportedNodeVersion', () => {
	it('accepts the minimum and anything newer', () => {
		expect(isSupportedNodeVersion('26.12.1')).toBe(true);
		expect(isSupportedNodeVersion('v26.12.1')).toBe(true);
		expect(isSupportedNodeVersion('26.12.2')).toBe(true);
		expect(isSupportedNodeVersion('26.13.0')).toBe(true);
		expect(isSupportedNodeVersion('27.0.0')).toBe(true);
	});

	it('rejects anything older', () => {
		expect(isSupportedNodeVersion('26.12.0')).toBe(false);
		expect(isSupportedNodeVersion('26.10.0')).toBe(false);
		expect(isSupportedNodeVersion('24.16.0')).toBe(false);
		expect(isSupportedNodeVersion('9.99.99')).toBe(false);
	});

	it('compares numerically, not as strings', () => {
		expect(isSupportedNodeVersion('100.0.0', '26.12.1')).toBe(true);
		expect(isSupportedNodeVersion('26.9.9', '26.12.1')).toBe(false);
	});

	it('throws on an unparseable version', () => {
		expect(() => isSupportedNodeVersion('latest')).toThrow();
	});
});

describe('assertSupportedNodeVersion', () => {
	it('throws below the minimum and names both versions', () => {
		expect(() => assertSupportedNodeVersion('26.10.0')).toThrow(/26\.12\.1.*26\.10\.0/);
	});

	it('passes at or above the minimum', () => {
		expect(() => assertSupportedNodeVersion('26.12.1')).not.toThrow();
	});
});

describe('MIN_NODE_VERSION', () => {
	const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

	it('matches package.json engines', () => {
		const pkg = JSON.parse(read('../../../package.json'));
		expect(pkg.engines.node).toBe(`>=${MIN_NODE_VERSION}`);
	});

	it('matches .nvmrc and .node-version', () => {
		expect(read('../../../.nvmrc').trim()).toBe(MIN_NODE_VERSION);
		expect(read('../../../.node-version').trim()).toBe(MIN_NODE_VERSION);
	});
});
