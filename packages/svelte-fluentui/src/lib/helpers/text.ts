/**
 * Text matching for filters, type-ahead and inline completion.
 *
 * `diacritics: false` (the default) folds accents away, so "zlut" finds "Žluť";
 * `diacritics: true` keeps them significant (plain case-insensitive match).
 */

export type TextMatchOptions = {
	/** Treat accented and plain letters as different. Default `false`. */
	diacritics?: boolean
}

/** Lowercases and, unless `diacritics` is set, strips diacritics. */
export function normalizeForSearch(text: string, {diacritics = false}: TextMatchOptions = {}): string {
	const lower = text.toLowerCase()
	return diacritics ? lower : lower.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

/** Case-insensitive "contains". An empty query matches everything. */
export function containsText(text: string, query: string, options?: TextMatchOptions): boolean {
	return normalizeForSearch(text, options).includes(normalizeForSearch(query, options))
}

/** Case-insensitive "starts with". An empty query matches everything. */
export function startsWithText(text: string, query: string, options?: TextMatchOptions): boolean {
	return normalizeForSearch(text, options).startsWith(normalizeForSearch(query, options))
}
