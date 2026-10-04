/**
 * Port of Laravel's `Str::slug` / `str_slug`: ASCII-fold, lowercase,
 * replace non-alphanumeric runs with `-`, trim leading/trailing dashes.
 */
export function slugify(value: string): string {
	return value
		.replace(/\u00aa/gi, 'a') // ª feminine ordinal
		.replace(/\u00ba/gi, 'o') // º masculine ordinal
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
