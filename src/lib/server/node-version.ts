/**
 * The oldest Node.js this app may run on. Keep it in sync with `engines.node` in
 * package.json and with `.nvmrc` / `.node-version` (node-version.spec.ts checks this).
 * npm refuses to install below it (`engine-strict` in .npmrc); the server's `init` hook
 * refuses to start below it.
 */
export const MIN_NODE_VERSION = '26.12.1';

function parse(version: string): [number, number, number] {
	const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
	if (!match) throw new Error(`Unrecognised Node.js version: ${version}`);
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isSupportedNodeVersion(version: string, min = MIN_NODE_VERSION): boolean {
	const current = parse(version);
	const minimum = parse(min);
	for (let i = 0; i < 3; i++) {
		if (current[i] !== minimum[i]) return current[i] > minimum[i];
	}
	return true;
}

export function assertSupportedNodeVersion(version = process.versions.node): void {
	if (!isSupportedNodeVersion(version)) {
		throw new Error(
			`Node.js ${MIN_NODE_VERSION} or newer is required, but this is ${version}. Upgrade Node.js.`
		);
	}
}
