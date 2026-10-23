/**
 * Ports Api\ClubsController@search (`GET /api/clubs/search?name=`): fuzzy club lookup by name.
 *
 * The scoring is the legacy `calculateMatchScore`, kept exact. PHP measured and split strings
 * by bytes and lowercased ASCII only, so lengths, prefixes and character overlap go through
 * the byte helpers in php.ts.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { clubs, teams } from '#lib/server/db/schema.ts';
import { phpTrim, phpUsort, samePrefixBytes, strSplitBytes, strlen, strtolower } from './php.ts';

const EXCLUDED_CLUBS = ['Clube de Testes A', 'Clube de Testes B'];

const NORMALIZE_CHARS: Record<string, string> = {
	Š: 'S',
	š: 's',
	Ð: 'Dj',
	Ž: 'Z',
	ž: 'z',
	À: 'A',
	Á: 'A',
	Â: 'A',
	Ã: 'A',
	Ä: 'A',
	Å: 'A',
	Æ: 'A',
	Ç: 'C',
	È: 'E',
	É: 'E',
	Ê: 'E',
	Ë: 'E',
	Ì: 'I',
	Í: 'I',
	Î: 'I',
	Ï: 'I',
	Ñ: 'N',
	Ń: 'N',
	Ò: 'O',
	Ó: 'O',
	Ô: 'O',
	Õ: 'O',
	Ö: 'O',
	Ø: 'O',
	Ù: 'U',
	Ú: 'U',
	Û: 'U',
	Ü: 'U',
	Ý: 'Y',
	Þ: 'B',
	ß: 'Ss',
	à: 'a',
	á: 'a',
	â: 'a',
	ã: 'a',
	ä: 'a',
	å: 'a',
	æ: 'a',
	ç: 'c',
	è: 'e',
	é: 'e',
	ê: 'e',
	ë: 'e',
	ì: 'i',
	í: 'i',
	î: 'i',
	ï: 'i',
	ð: 'o',
	ñ: 'n',
	ń: 'n',
	ò: 'o',
	ó: 'o',
	ô: 'o',
	õ: 'o',
	ö: 'o',
	ø: 'o',
	ù: 'u',
	ú: 'u',
	û: 'u',
	ü: 'u',
	ý: 'y',
	þ: 'b',
	ÿ: 'y',
	ƒ: 'f',
	ă: 'a',
	ș: 's',
	ț: 't',
	Ă: 'A',
	Ș: 'S',
	Ț: 'T'
};

const STOP_WORDS = [
	'da',
	'de',
	'do',
	'das',
	'dos',
	'e',
	'em',
	'na',
	'no',
	'nas',
	'nos',
	'o',
	'a',
	'os',
	'as'
];

/** `strtolower(strtr($value, $normalizeChars))`. */
export function normalizeString(value: string): string {
	return strtolower(Array.from(value, (c) => NORMALIZE_CHARS[c] ?? c).join(''));
}

/** Split on ASCII whitespace, trim, drop falsy words ("" and "0") and stop words. */
export function getWords(value: string): string[] {
	return value
		.split(/[ \t\n\v\f\r]+/)
		.map(phpTrim)
		.filter((w) => w !== '' && w !== '0')
		.filter((w) => !STOP_WORDS.includes(w));
}

/** PHP 7.4 `strpos($haystack, $needle) !== false` (an empty needle is false). */
function contains(haystack: string, needle: string): boolean {
	return needle !== '' && haystack.includes(needle);
}

function partialWordScore(clubWords: string[], searchWords: string[]): number {
	const maxWords = Math.max(clubWords.length, searchWords.length);
	if (maxWords === 0) return 0;

	let matches = 0;
	for (const clubWord of clubWords) {
		for (const searchWord of searchWords) {
			if (strlen(clubWord) >= 3 && strlen(searchWord) >= 3) {
				if (samePrefixBytes(clubWord, searchWord, 3)) {
					matches++;
					break;
				}
			}
		}
	}

	return matches / maxWords;
}

function characterSimilarity(a: string, b: string): number {
	const len1 = strlen(a);
	const len2 = strlen(b);
	if (len1 === 0 || len2 === 0) return 0;

	let common = 0;
	const rest = strSplitBytes(b);
	for (const byte of strSplitBytes(a)) {
		const i = rest.indexOf(byte);
		if (i !== -1) {
			common++;
			rest.splice(i, 1);
		}
	}

	return common / Math.max(len1, len2);
}

export function calculateMatchScore(clubName: string, searchTerm: string): number {
	clubName = phpTrim(clubName);
	searchTerm = phpTrim(searchTerm);

	const club = normalizeString(clubName);
	const search = normalizeString(searchTerm);

	// 1. Exact match
	if (club === search) return 1.0;

	// 2. Case-insensitive exact match
	if (strtolower(clubName) === strtolower(searchTerm)) return 0.95;

	// 3. Club name inside the search term
	if (contains(search, club)) return 0.9 * (strlen(club) / strlen(search));

	// 4. Search term inside the club name
	if (contains(club, search)) return 0.8 * (strlen(search) / strlen(club));

	// 5. Common words
	const clubWords = getWords(club);
	const searchWords = getWords(search);
	const common = clubWords.filter((w) => searchWords.includes(w));
	if (common.length > 0) {
		return 0.7 * (common.length / Math.max(clubWords.length, searchWords.length));
	}

	// 6. Words starting the same way
	const partial = partialWordScore(clubWords, searchWords);
	if (partial > 0) return 0.6 * partial;

	// 7. Character similarity, for typos
	const similarity = characterSimilarity(club, search);
	if (similarity > 0.6) return 0.4 * similarity;

	return 0;
}

/** Null when the search term is missing (legacy 400). */
export async function searchClubs(name: unknown) {
	if (typeof name !== 'string' || name === '' || name === '0') return null;

	const clubRows = await db
		.select({ id: clubs.id, name: clubs.name })
		.from(clubs)
		.where(eq(clubs.visible, true))
		.orderBy(asc(clubs.id));

	// Excluded in code, not SQL: legacy compared case-sensitively, the collation doesn't.
	const scored = clubRows
		.filter((club) => !EXCLUDED_CLUBS.includes(club.name))
		.map((club) => ({ club, score: calculateMatchScore(club.name, name) }))
		.filter((r) => r.score > 0);

	const teamRows = scored.length
		? await db
				.select({ id: teams.id, name: teams.name, clubId: teams.clubId })
				.from(teams)
				.where(
					and(
						inArray(
							teams.clubId,
							scored.map((r) => r.club.id)
						),
						eq(teams.visible, true)
					)
				)
				.orderBy(asc(teams.id))
		: [];

	// usort with `$b <=> $a`, through PHP's own (unstable) sort so ties keep the legacy order.
	phpUsort(scored, (a, b) => Math.sign(b.score - a.score));

	return {
		success: true,
		data: scored.map(({ club, score }) => ({
			id: club.id,
			name: club.name,
			teams: teamRows.filter((t) => t.clubId === club.id).map((t) => ({ id: t.id, name: t.name })),
			match_score: score
		}))
	};
}
