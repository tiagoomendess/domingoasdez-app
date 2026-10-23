/**
 * The slice of Laravel 5.8's Validator the legacy API controllers use, with its semantics:
 *
 * - Rules other than `required` are skipped when the field is absent, and when it is null and
 *   the field has `nullable`.
 * - Every failing rule adds a message (no `bail`); `exists` is skipped once the field has one.
 * - `min` / `max` measure the number when the field has `integer` or `numeric` and the value is
 *   numeric, otherwise the array size or the string length.
 * - Messages are the legacy `resources/lang/pt/validation.php` lines. `:attribute` is the field
 *   name with `_` as spaces, except the translated attributes (`email`).
 *
 * Rules are Laravel strings: `required`, `max:36`, `in:a,b`, `exists:players,id`.
 */
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { players } from '#lib/server/db/schema.ts';
import { isNumeric, phpString, phpTrim } from './php.ts';

export type Rules = Record<string, string[]>;
export type ValidationErrors = Record<string, string[]>;

const MESSAGES: Record<string, string> = {
	required: 'O campo :attribute é obrigatório.',
	string: 'The :attribute must be a string.',
	integer: 'The :attribute must be an integer.',
	numeric: 'The :attribute must be a number.',
	boolean: 'The :attribute field must be true or false.',
	array: 'The :attribute must be an array.',
	url: 'The :attribute format is invalid.',
	email: 'The :attribute must be a valid email address.',
	date: 'O campo :attribute não é uma data válida.',
	in: 'The selected :attribute is invalid.',
	exists: 'The selected :attribute is invalid.',
	'min.numeric': 'O campo :attribute tem de ser no mínimo :min.',
	'min.string': 'O campo :attribute tem de ter pelo menos :min caracteres.',
	'min.array': 'The :attribute must have at least :min items.',
	'max.numeric': 'O campo :attribute não pode ser maior que :max.',
	'max.string': 'O campo :attribute não pode ser maior do que :max caracteres.',
	'max.array': 'The :attribute may not have more than :max items.'
};

/** `validation.attributes` from the legacy translations. */
const ATTRIBUTES: Record<string, string> = {
	email: 'Endereço de Email',
	code: 'Código',
	codigo: 'Código'
};

/** Laravel 5.8 `validateUrl` pattern (from Symfony's UrlValidator 2.7.4), converted to JS. */
const URL_PATTERN = new RegExp(
	String.raw`^((aaa|aaas|about|acap|acct|acr|adiumxtra|afp|afs|aim|apt|attachment|aw|barion|beshare|bitcoin|blob|bolo|callto|cap|chrome|chrome-extension|cid|coap|coaps|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-playcontainer|dlna-playsingle|dns|dntp|dtn|dvb|ed2k|example|facetime|fax|feed|feedready|file|filesystem|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|ham|hcp|http|https|iax|icap|icon|im|imap|info|iotdisco|ipn|ipp|ipps|irc|irc6|ircs|iris|iris.beep|iris.lwz|iris.xpc|iris.xpcs|itms|jabber|jar|jms|keyparc|lastfm|ldap|ldaps|magnet|mailserver|mailto|maps|market|message|mid|mms|modem|ms-help|ms-settings|ms-settings-airplanemode|ms-settings-bluetooth|ms-settings-camera|ms-settings-cellular|ms-settings-cloudstorage|ms-settings-emailandaccounts|ms-settings-language|ms-settings-location|ms-settings-lock|ms-settings-nfctransactions|ms-settings-notifications|ms-settings-power|ms-settings-privacy|ms-settings-proximity|ms-settings-screenrotation|ms-settings-wifi|ms-settings-workplace|msnim|msrp|msrps|mtqp|mumble|mupdate|mvn|news|nfs|ni|nih|nntp|notes|oid|opaquelocktoken|pack|palm|paparazzi|pkcs11|platform|pop|pres|prospero|proxy|psyc|query|redis|rediss|reload|res|resource|rmi|rsync|rtmfp|rtmp|rtsp|rtsps|rtspu|secondlife|s3|service|session|sftp|sgn|shttp|sieve|sip|sips|skype|smb|sms|smtp|snews|snmp|soap.beep|soap.beeps|soldat|spotify|ssh|steam|stun|stuns|submit|svn|tag|teamspeak|tel|teliaeid|telnet|tftp|things|thismessage|tip|tn3270|turn|turns|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|videotex|view-source|wais|webcal|ws|wss|wtai|wyciwyg|xcon|xcon-userid|xfire|xmlrpc\.beep|xmlrpc.beeps|xmpp|xri|ymsgr|z39\.50|z39\.50r|z39\.50s))://(([\p{L}\p{N}-]+:)?([\p{L}\p{N}-]+)@)?(([\p{L}\p{N}\p{S}\-_\.])+(\.?([\p{L}]|xn--[\p{L}\p{N}-]+)+\.?)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[(?:(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){6})(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:::(?:(?:(?:[0-9a-f]{1,4})):){5})(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:[0-9a-f]{1,4})))?::(?:(?:(?:[0-9a-f]{1,4})):){4})(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){0,1}(?:(?:[0-9a-f]{1,4})))?::(?:(?:(?:[0-9a-f]{1,4})):){3})(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){0,2}(?:(?:[0-9a-f]{1,4})))?::(?:(?:(?:[0-9a-f]{1,4})):){2})(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){0,3}(?:(?:[0-9a-f]{1,4})))?::(?:(?:[0-9a-f]{1,4})):)(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){0,4}(?:(?:[0-9a-f]{1,4})))?::)(?:(?:(?:(?:(?:[0-9a-f]{1,4})):(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){0,5}(?:(?:[0-9a-f]{1,4})))?::)(?:(?:[0-9a-f]{1,4})))|(?:(?:(?:(?:(?:(?:[0-9a-f]{1,4})):){0,6}(?:(?:[0-9a-f]{1,4})))?::))))\])(:[0-9]+)?(/?|/\S+|\?\S*|#\S*)$`,
	'iu'
);

const ATEXT = String.raw`[A-Za-z0-9!#$%&'*+/=?^_\x60{|}~\u0080-￿-]`;
const LABEL = String.raw`[A-Za-z0-9\u0080-￿](?:[A-Za-z0-9\u0080-￿-]*[A-Za-z0-9\u0080-￿])?`;
/** Close to egulias' RFCValidation, which Laravel 5.8's `email` rule uses: no TLD required. */
const EMAIL_PATTERN = new RegExp(
	String.raw`^${ATEXT}+(?:\.${ATEXT}+)*@(?:${LABEL}(?:\.${LABEL})*|\[[0-9a-fA-F:.]+\])$`,
	'u'
);

type Rule = { name: string; params: string[] };

function parseRule(rule: string): Rule {
	const colon = rule.indexOf(':');
	if (colon === -1) return { name: rule.toLowerCase(), params: [] };
	const name = rule.slice(0, colon).toLowerCase();
	const params = rule
		.slice(colon + 1)
		.split(',')
		.map((p) => p.replace(/^"(.*)"$/, '$1'));
	return { name, params };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** PHP `is_array` (decoded JSON objects are arrays too). */
function isPhpArray(value: unknown): boolean {
	return Array.isArray(value) || isPlainObject(value);
}

function count(value: unknown): number {
	if (Array.isArray(value)) return value.length;
	if (isPlainObject(value)) return Object.keys(value).length;
	return 0;
}

/** `filter_var($value, FILTER_VALIDATE_INT) !== false`. */
function isInteger(value: unknown): boolean {
	if (typeof value === 'number') return Number.isInteger(value) && Math.abs(value) <= 2 ** 63;
	if (value === true) return true;
	if (typeof value !== 'string') return false;
	const v = value.replace(/^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g, '');
	return /^[+-]?(0|[1-9]\d*)$/.test(v) && Math.abs(Number(v)) <= 2 ** 63;
}

function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validDate(y: number, m: number, d: number): boolean {
	return y >= 1 && y <= 32767 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/**
 * `strtotime($value) !== false` and `checkdate()` on `date_parse($value)`. The common numeric
 * formats are checked exactly; anything else falls back to the JS date parser.
 */
export function parseLegacyDate(value: unknown): Date | null {
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const v = String(value).trim();

	const iso =
		/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(
			v
		);
	if (iso) {
		const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
		if (!validDate(y, m, d)) return null;
		const [h, mi, s] = [Number(iso[4] ?? 0), Number(iso[5] ?? 0), Number(iso[6] ?? 0)];
		if (h > 23 || mi > 59 || s > 59) return null;
		return new Date(Date.UTC(y, m - 1, d, h, mi, s));
	}

	const slashes = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v);
	if (slashes) {
		const [y, m, d] = [Number(slashes[1]), Number(slashes[2]), Number(slashes[3])];
		return validDate(y, m, d) ? new Date(Date.UTC(y, m - 1, d)) : null;
	}

	// d-m-Y and d.m.Y (strtotime reads dashes and dots as European order)
	const european = /^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/.exec(v);
	if (european) {
		const [d, m, y] = [Number(european[1]), Number(european[2]), Number(european[3])];
		return validDate(y, m, d) ? new Date(Date.UTC(y, m - 1, d)) : null;
	}

	// m/d/Y (strtotime reads slashes as American order)
	const american = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
	if (american) {
		const [m, d, y] = [Number(american[1]), Number(american[2]), Number(american[3])];
		return validDate(y, m, d) ? new Date(Date.UTC(y, m - 1, d)) : null;
	}

	if (/^\d+$/.test(v) || !/\d{4}/.test(v)) return null;
	const parsed = Date.parse(v);
	return Number.isNaN(parsed) ? null : new Date(parsed);
}

function displayAttribute(field: string): string {
	return ATTRIBUTES[field] ?? field.replace(/_/g, ' ');
}

function message(key: string, field: string, params: string[]): string {
	return (MESSAGES[key] ?? `validation.${key}`)
		.replace(':attribute', displayAttribute(field))
		.replace(':min', params[0] ?? '')
		.replace(':max', params[0] ?? '')
		.replace(':values', params.join(', '));
}

async function existsIn(table: string, column: string, value: unknown): Promise<boolean> {
	if (table !== 'players' || column !== 'id') {
		throw new Error(`exists:${table},${column} is not supported`);
	}
	const values = isPhpArray(value) ? Object.values(value as object) : [value];
	const ids = [...new Set(values.map(phpString))];
	if (ids.length === 0) return false;
	const [row] = await db
		.select({ n: sql<number>`count(*)`.mapWith(Number) })
		.from(players)
		.where(
			sql`${players.id} in (${sql.join(
				ids.map((id) => sql`${id}`),
				sql`, `
			)})`
		);
	return (row?.n ?? 0) >= ids.length;
}

export async function validate(
	data: Record<string, unknown>,
	rules: Rules
): Promise<ValidationErrors | null> {
	const errors: ValidationErrors = {};

	for (const [field, fieldRules] of Object.entries(rules)) {
		const parsed = fieldRules.map(parseRule);
		const has = (...names: string[]) => parsed.some((r) => names.includes(r.name));
		const present = Object.prototype.hasOwnProperty.call(data, field);
		const value = present ? data[field] : undefined;
		const numeric = has('numeric', 'integer');
		const type = numeric ? 'numeric' : has('array') ? 'array' : 'string';

		const size = (): number => {
			if (numeric && isNumeric(value)) return Number(value);
			if (isPhpArray(value)) return count(value);
			return Array.from(phpString(value)).length;
		};

		const fail = (key: string, params: string[] = []) => {
			(errors[field] ??= []).push(message(key, field, params));
		};

		for (const { name, params } of parsed) {
			const implicit = name === 'required';
			if (!implicit) {
				if (typeof value === 'string' && phpTrim(value) === '') continue;
				if (!present) continue;
				if (has('nullable') && value === null) continue;
				if (name === 'exists' && errors[field]) continue;
			}

			switch (name) {
				case 'nullable':
					break;
				case 'required': {
					const empty =
						value == null ||
						(typeof value === 'string' && phpTrim(value) === '') ||
						(isPhpArray(value) && count(value) < 1);
					if (empty) fail('required');
					break;
				}
				case 'string':
					if (typeof value !== 'string') fail('string');
					break;
				case 'integer':
					if (!isInteger(value)) fail('integer');
					break;
				case 'numeric':
					if (!isNumeric(value)) fail('numeric');
					break;
				case 'boolean':
					if (![true, false, 0, 1, '0', '1'].includes(value as never)) fail('boolean');
					break;
				case 'array':
					if (!isPhpArray(value)) fail('array');
					break;
				case 'url':
					if (typeof value !== 'string' || !URL_PATTERN.test(value)) fail('url');
					break;
				case 'email':
					if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) fail('email');
					break;
				case 'date':
					if (!parseLegacyDate(value)) fail('date');
					break;
				case 'in':
					if (isPhpArray(value) || !params.includes(phpString(value))) fail('in', params);
					break;
				case 'min':
					if (!(size() >= Number(params[0]))) fail(`min.${type}`, params);
					break;
				case 'max':
					if (!(size() <= Number(params[0]))) fail(`max.${type}`, params);
					break;
				case 'exists':
					if (!(await existsIn(params[0], params[1] ?? field, value))) fail('exists');
					break;
				default:
					throw new Error(`Validation rule ${name} is not supported`);
			}
		}
	}

	return Object.keys(errors).length ? errors : null;
}
