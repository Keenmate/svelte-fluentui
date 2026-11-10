/**
 * The user's locale, read when called. Falls back to `en-US` where there is no
 * `navigator` (SSR), so it is safe as a prop default.
 */
export function defaultLocale(): Intl.Locale {
	return new Intl.Locale(typeof navigator !== "undefined" ? navigator.language : "en-US")
}
