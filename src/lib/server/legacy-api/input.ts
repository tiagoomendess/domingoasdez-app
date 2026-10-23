/**
 * Request input the way Laravel 5.8 builds it for the legacy API controllers.
 *
 * - `all` is `$request->all()`: the body (JSON, urlencoded or multipart) merged over the query
 *   string, the body winning (`$input + $query`).
 * - `json` is `$request->json()`: the raw body decoded as JSON, whatever the content type.
 * - The global TrimStrings and ConvertEmptyStringsToNull middleware ran on the query and on the
 *   body, so strings are trimmed and empty strings become null.
 * - Form keys use PHP's bracket syntax: `a[]=1&a[]=2`, `a[b]=1`.
 */
import { phpTrim } from './php.ts';

export type LegacyInput = {
	all: Record<string, unknown>;
	json: Record<string, unknown>;
};

/** Ports TrimStrings + ConvertEmptyStringsToNull, recursively. */
export function cleanInput(value: unknown): unknown {
	if (typeof value === 'string') {
		const trimmed = phpTrim(value);
		return trimmed === '' ? null : trimmed;
	}
	if (Array.isArray(value)) return value.map(cleanInput);
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanInput(v)]));
	}
	return value;
}

/** PHP's `parse_str` bracket handling for `name`, `name[]`, `name[key]`, `name[a][b]`. */
export function parsePhpPairs(pairs: Iterable<[string, string]>): Record<string, unknown> {
	const out: Record<string, unknown> = {};

	for (const [rawKey, value] of pairs) {
		const open = rawKey.indexOf('[');
		if (open <= 0 || !rawKey.endsWith(']')) {
			out[rawKey] = value;
			continue;
		}

		const keys = [rawKey.slice(0, open)];
		for (const m of rawKey.slice(open).matchAll(/\[([^\]]*)\]/g)) keys.push(m[1]);

		let node = out;
		keys.forEach((key, i) => {
			const last = i === keys.length - 1;
			let k = key;
			if (k === '') {
				const existing = Object.keys(node).filter((x) => /^\d+$/.test(x));
				k = String(existing.length ? Math.max(...existing.map(Number)) + 1 : 0);
			}
			if (last) {
				node[k] = value;
			} else {
				const next = node[k];
				if (!next || typeof next !== 'object') node[k] = {};
				node = node[k] as Record<string, unknown>;
			}
		});
	}

	return out;
}

function asObject(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function parseJson(text: string): Record<string, unknown> {
	if (!text) return {};
	try {
		return asObject(JSON.parse(text));
	} catch {
		return {};
	}
}

/** Laravel's `Request::isJson()`: the content type mentions `/json` or `+json`. */
function isJson(request: Request): boolean {
	const type = request.headers.get('content-type') ?? '';
	return type.includes('/json') || type.includes('+json');
}

export async function readLegacyInput(request: Request, url: URL): Promise<LegacyInput> {
	const query = asObject(cleanInput(parsePhpPairs(url.searchParams.entries())));

	if (request.method === 'GET' || request.method === 'HEAD') {
		return { all: query, json: {} };
	}

	const type = request.headers.get('content-type') ?? '';

	if (type.includes('multipart/form-data')) {
		const pairs: [string, string][] = [];
		try {
			const form = await request.formData();
			for (const [k, v] of form.entries()) if (typeof v === 'string') pairs.push([k, v]);
		} catch {
			// An unreadable body is treated as empty, like PHP does.
		}
		return { all: { ...query, ...asObject(cleanInput(parsePhpPairs(pairs))) }, json: {} };
	}

	const text = await request.text();
	const json = isJson(request) ? asObject(cleanInput(parseJson(text))) : parseJson(text);

	let body: Record<string, unknown> = {};
	if (isJson(request)) {
		body = json;
	} else if (type.includes('application/x-www-form-urlencoded')) {
		body = asObject(cleanInput(parsePhpPairs(new URLSearchParams(text).entries())));
	}

	return { all: { ...query, ...body }, json };
}
