/**
 * Text matching for filters, type-ahead and inline completion.
 *
 * Same rules as web-multiselect's `searchBehavior` (ported from
 * `@keenmate/web-components-core/search` `normalizeSearchText`).
 */

/**
 * How built-in search normalizes text before matching.
 *
 * - `normalized` (default) — ignores case and diacritics: `ces` matches `Český`, `muller` matches `Müller`
 * - `case-insensitive` — ignores case only: `čes` matches `Český`, `ces` does not
 * - `exact` — case- and diacritic-sensitive
 *
 * Every mode compares Unicode NFC text, so a composed `č` and `c` + combining caron are equal.
 */
export type SearchBehavior = "normalized" | "case-insensitive" | "exact"

/** Letters `normalized` folds by hand — they have no Unicode decomposition (or, for `ς`,
 *  lowercase differently by position) so stripping combining marks alone misses them. */
const FOLD_EXTRA: Record<string, string> = {
	"ł": "l", "ø": "o", "đ": "d", "ð": "d", "ħ": "h", "ı": "i", "ß": "ss", "æ": "ae", "œ": "oe", "ς": "σ",
	"ŧ": "t", "þ": "th", "ĳ": "ij", "ŀ": "l"
}
const FOLD_EXTRA_RE = /[łøđðħıßæœςŧþĳŀ]/g

/** Scripts whose combining marks are diacritics (`č` ~ `c`). Elsewhere a mark is part of
 *  the letter — a Devanagari vowel sign, a kana dakuten (`が` ≠ `か`) — and is kept. */
const DIACRITIC_BASE = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u
const MARK = /\p{M}/u

/** Folds one code point; `afterDiacriticBase` says whether the last base character was
 *  Latin / Greek / Cyrillic (a lone combining mark belongs to it). */
function foldCodePoint(ch: string, behavior: SearchBehavior, afterDiacriticBase: boolean): [string, boolean] {
	if (behavior === "exact") return [ch, afterDiacriticBase]
	if (behavior === "case-insensitive") {
		if (MARK.test(ch)) {
			// `İ` lowercases to `i` + combining dot; the dot is noise for a case-insensitive search.
			return [ch === "̇" && afterDiacriticBase ? "" : ch, afterDiacriticBase]
		}
		let lower = ch.toLowerCase()
		if (lower === "i̇") lower = "i"
		else if (lower === "ς") lower = "σ"
		else if (lower === "ß") lower = "ss"
		return [lower, DIACRITIC_BASE.test(ch)]
	}
	// normalized: compatibility decomposition (ligatures, full-width forms, no-break space),
	// diacritics stripped, lowercased, hand folds. The hand folds go first: NFKD would turn `ŀ` into `l·`.
	const extra = FOLD_EXTRA[ch.toLowerCase()]
	if (extra !== undefined) return [extra, true]
	let out = ""
	let base = afterDiacriticBase
	for (const part of ch.normalize("NFKD")) {
		if (MARK.test(part)) {
			if (!base) out += part
			continue
		}
		base = DIACRITIC_BASE.test(part)
		out += part
	}
	return [out.toLowerCase().replace(FOLD_EXTRA_RE, c => FOLD_EXTRA[c] ?? c), base]
}

/**
 * Prepares text for matching under `behavior` — used for both the option labels and the
 * typed term. Exported so a custom `filterCallback` can prepare text the same way.
 *
 * `normalized`: `Český` → `cesky`, `Łódź` → `lodz`; `case-insensitive`: `Český` → `český`,
 * `ß` → `ss`; `exact`: unchanged (NFC only).
 */
export function normalizeForSearch(text: string, behavior: SearchBehavior = "normalized"): string {
	const nfc = text.normalize("NFC")
	if (behavior === "exact") return nfc
	let folded = ""
	let afterDiacriticBase = false
	for (const ch of nfc) {
		const [f, base] = foldCodePoint(ch, behavior, afterDiacriticBase)
		afterDiacriticBase = base
		folded += f
	}
	return folded
}

/** "Contains" under `behavior`. An empty query matches everything. */
export function containsText(text: string, query: string, behavior?: SearchBehavior): boolean {
	return normalizeForSearch(text, behavior).includes(normalizeForSearch(query, behavior))
}

/** "Starts with" under `behavior`. An empty query matches everything. */
export function startsWithText(text: string, query: string, behavior?: SearchBehavior): boolean {
	return normalizeForSearch(text, behavior).startsWith(normalizeForSearch(query, behavior))
}
