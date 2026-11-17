import {i18n} from "../i18n/i18n-service.svelte.js"

/**
 * The default `culture` of Calendar, DatePicker and QuickGrid: the i18n locale
 * (`i18n.currentLocale`), so month names and number / date formats switch with the language.
 * When the browser's locale is the same language, it is used instead, keeping its region
 * (`en-GB`: Monday first, day/month order; `de-AT`), unless the i18n locale names a region itself.
 * Reactive when read inside `$derived` / markup.
 */
export function defaultCulture(): Intl.Locale {
	const app = new Intl.Locale(i18n.currentLocale)
	if (!app.region && typeof navigator !== "undefined") {
		try {
			const browser = new Intl.Locale(navigator.language)
			if (browser.language === app.language) return browser
		} catch {
			// unparsable navigator.language — fall through to the i18n locale
		}
	}
	return app
}
