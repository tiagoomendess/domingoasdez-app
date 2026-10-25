/**
 * PHP string semantics the legacy API relied on. PHP's `strlen`, `substr`, `str_split` and
 * `strtolower` work on bytes (ASCII-only case folding), so ports that compare lengths or
 * prefixes go through these helpers instead of JS string methods.
 */

const encoder = new TextEncoder();

/** PHP `trim` / `rtrim` default character list: " \t\n\r\0\x0B". */
const PHP_TRIM_CHARS = ' \t\n\r\0\u000b';

export function phpTrim(value: string): string {
	let start = 0;
	let end = value.length;
	while (start < end && PHP_TRIM_CHARS.includes(value[start])) start++;
	while (end > start && PHP_TRIM_CHARS.includes(value[end - 1])) end--;
	return value.slice(start, end);
}

export function phpRtrim(value: string): string {
	let end = value.length;
	while (end > 0 && PHP_TRIM_CHARS.includes(value[end - 1])) end--;
	return value.slice(0, end);
}

/** UTF-8 bytes of a string (what PHP's byte functions see). */
export function bytes(value: string): Uint8Array {
	return encoder.encode(value);
}

/** PHP `strlen`: byte length. */
export function strlen(value: string): number {
	return bytes(value).length;
}

/** PHP `strtolower` in the C locale: only A–Z are folded. */
export function strtolower(value: string): string {
	return value.replace(/[A-Z]+/g, (s) => s.toLowerCase());
}

/** PHP `substr($value, 0, $length) === substr($other, 0, $length)`, compared on bytes. */
export function samePrefixBytes(a: string, b: string, length: number): boolean {
	const x = bytes(a).subarray(0, length);
	const y = bytes(b).subarray(0, length);
	if (x.length !== y.length) return false;
	return x.every((byte, i) => byte === y[i]);
}

/** PHP `str_split`: one entry per byte. */
export function strSplitBytes(value: string): number[] {
	return Array.from(bytes(value));
}

/**
 * Laravel 5.8 `Str::limit($value, $limit, $end)`: unchanged when it fits, otherwise cut to
 * `$limit` characters, right-trimmed, plus `$end`.
 */
export function strLimit(value: string, limit: number, end = '...'): string {
	const chars = Array.from(value);
	if (chars.length <= limit) return value;
	return phpRtrim(chars.slice(0, limit).join('')) + end;
}

/** PHP `json_encode` of a string: escapes `/` and every non-ASCII character as `\uXXXX`. */
export function phpJsonString(value: string): string {
	return JSON.stringify(value)
		.replace(/\//g, '\\/')
		.replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * PHP `json_encode` of a decoded request value. PHP decodes JSON objects to arrays, so an empty
 * object or one keyed 0…n-1 comes back out as a list.
 */
export function phpJsonEncode(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : '0';
	if (typeof value === 'string') return phpJsonString(value);
	if (Array.isArray(value)) return `[${value.map(phpJsonEncode).join(',')}]`;
	if (typeof value === 'object') {
		const entries = Object.entries(value);
		const isList = entries.every(([k], i) => k === String(i));
		if (isList) return `[${entries.map(([, v]) => phpJsonEncode(v)).join(',')}]`;
		return `{${entries.map(([k, v]) => `${phpJsonString(k)}:${phpJsonEncode(v)}`).join(',')}}`;
	}
	return 'null';
}

// ---------------------------------------------------------------------------------------------
// PHP 7.4 `usort`: zend_sort from Zend/zend_sort.c, a hybrid insertion sort / quicksort that is
// not stable. Ported index for index so equal elements end up in the same order as in PHP.

type Cmp<T> = (a: T, b: T) => number;

function sort2<T>(a: T[], x: number, y: number, cmp: Cmp<T>) {
	if (cmp(a[x], a[y]) > 0) swap(a, x, y);
}

function swap<T>(a: T[], x: number, y: number) {
	const t = a[x];
	a[x] = a[y];
	a[y] = t;
}

function sort3<T>(a: T[], x: number, y: number, z: number, cmp: Cmp<T>) {
	if (!(cmp(a[x], a[y]) > 0)) {
		if (!(cmp(a[y], a[z]) > 0)) return;
		swap(a, y, z);
		if (cmp(a[x], a[y]) > 0) swap(a, x, y);
		return;
	}
	if (!(cmp(a[z], a[y]) > 0)) {
		swap(a, x, z);
		return;
	}
	swap(a, x, y);
	if (cmp(a[y], a[z]) > 0) swap(a, y, z);
}

function sort4<T>(a: T[], x: number, y: number, z: number, w: number, cmp: Cmp<T>) {
	sort3(a, x, y, z, cmp);
	if (cmp(a[z], a[w]) > 0) {
		swap(a, z, w);
		if (cmp(a[y], a[z]) > 0) {
			swap(a, y, z);
			if (cmp(a[x], a[y]) > 0) swap(a, x, y);
		}
	}
}

function sort5<T>(a: T[], x: number, y: number, z: number, w: number, v: number, cmp: Cmp<T>) {
	sort4(a, x, y, z, w, cmp);
	if (cmp(a[w], a[v]) > 0) {
		swap(a, w, v);
		if (cmp(a[z], a[w]) > 0) {
			swap(a, z, w);
			if (cmp(a[y], a[z]) > 0) {
				swap(a, y, z);
				if (cmp(a[x], a[y]) > 0) swap(a, x, y);
			}
		}
	}
}

function insertSort<T>(a: T[], start: number, n: number, cmp: Cmp<T>) {
	switch (n) {
		case 0:
		case 1:
			return;
		case 2:
			return sort2(a, start, start + 1, cmp);
		case 3:
			return sort3(a, start, start + 1, start + 2, cmp);
		case 4:
			return sort4(a, start, start + 1, start + 2, start + 3, cmp);
		case 5:
			return sort5(a, start, start + 1, start + 2, start + 3, start + 4, cmp);
	}

	const end = start + n;
	const sentry = start + 6;
	for (let i = start + 1; i < sentry; i++) {
		let j = i - 1;
		if (!(cmp(a[j], a[i]) > 0)) continue;
		while (j !== start) {
			j--;
			if (!(cmp(a[j], a[i]) > 0)) {
				j++;
				break;
			}
		}
		for (let k = i; k > j; k--) swap(a, k, k - 1);
	}

	for (let i = sentry; i < end; i++) {
		let j = i - 1;
		if (!(cmp(a[j], a[i]) > 0)) continue;
		for (;;) {
			j -= 2;
			if (!(cmp(a[j], a[i]) > 0)) {
				j++;
				if (!(cmp(a[j], a[i]) > 0)) j++;
				break;
			}
			if (j === start) break;
			if (j === start + 1) {
				j--;
				if (cmp(a[i], a[j]) > 0) j++;
				break;
			}
		}
		for (let k = i; k > j; k--) swap(a, k, k - 1);
	}
}

function zendSort<T>(a: T[], base: number, nmemb: number, cmp: Cmp<T>) {
	for (;;) {
		if (nmemb <= 16) {
			insertSort(a, base, nmemb, cmp);
			return;
		}

		const start = base;
		const end = start + nmemb;
		const offset = nmemb >> 1;
		let pivot = start + offset;

		if (nmemb >> 10) {
			const delta = offset >> 1;
			sort5(a, start, start + delta, pivot, pivot + delta, end - 1, cmp);
		} else {
			sort3(a, start, pivot, end - 1, cmp);
		}
		swap(a, start + 1, pivot);
		pivot = start + 1;
		let i = pivot + 1;
		let j = end - 1;

		partition: for (;;) {
			while (cmp(a[pivot], a[i]) > 0) {
				i++;
				if (i === j) break partition;
			}
			j--;
			if (j === i) break;
			while (cmp(a[j], a[pivot]) > 0) {
				j--;
				if (j === i) break partition;
			}
			swap(a, i, j);
			i++;
			if (i === j) break;
		}

		swap(a, pivot, i - 1);
		if (i - 1 - start < end - i) {
			zendSort(a, start, i - start - 1, cmp);
			base = i;
			nmemb = end - i;
		} else {
			zendSort(a, i, end - i, cmp);
			base = start;
			nmemb = i - start - 1;
		}
	}
}

/** PHP 7.4 `usort($array, $cmp)`: sorts in place with the same (unstable) element order. */
export function phpUsort<T>(array: T[], cmp: Cmp<T>): T[] {
	if (array.length > 1) zendSort(array, 0, array.length, cmp);
	return array;
}

/** PHP `is_numeric` (PHP 7: leading whitespace allowed, trailing not). */
export function isNumeric(value: unknown): boolean {
	if (typeof value === 'number') return Number.isFinite(value);
	if (typeof value !== 'string') return false;
	return /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(value);
}

/** PHP string cast for scalars (`true` → "1", `false`/null → ""). */
export function phpString(value: unknown): string {
	if (value === true) return '1';
	if (value === false || value == null) return '';
	return String(value);
}
