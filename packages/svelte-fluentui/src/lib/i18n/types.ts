/**
 * svelte-fluentui i18n types (same shapes as svelte-pure-admin's).
 */
import type {en} from "./locales/en.js"

/** An available language. */
export interface Language {
	/** Language code (`"en"`, `"de"`, `"fr"`). */
	code: string
	/** Display name (`"German"`). */
	label?: string
	/** Native name (`"Deutsch"`). */
	nativeLabel?: string
}

/** Options of `i18n.init()`. */
export interface I18nInitOptions {
	/** Initial locale (default `"en"`). */
	locale?: string
	/** Locale used when a key is missing (default `"en"`). */
	fallbackLocale?: string
	/** Available languages: codes or `Language` objects. Default: the built-in English and German. */
	languages?: (string | Language)[]
	/**
	 * Translations per locale, added on init. Flat keys; your own (`app.*`) and overrides of the
	 * library's (`svelteFluentUI.*`) side by side. The built-in `en` / `de` are always included.
	 */
	translations?: Record<string, Record<string, string>>
	/** Loads a locale that isn't loaded yet when `setLocale()` switches to it (file, API, DB…). */
	loadTranslations?: (locale: string) => Promise<Record<string, string>>
}

/** Every built-in key (`svelteFluentUI.<component>.<key>`). */
export type SvelteFluentUITranslationKey = keyof typeof en

/** A flat dictionary of library strings for one locale. */
export type SvelteFluentUITranslations = Record<string, string>

/** The local keys of one component: `LabelKey<"datePicker">` → `"placeholder" | "openPopupAriaLabel" | …`. */
export type LabelKey<C extends string> = SvelteFluentUITranslationKey extends infer K
	? K extends `svelteFluentUI.${C}.${infer Rest}`
		? Rest
		: never
	: never

/**
 * A component's `labels` prop: any of its keys, values in the same ICU syntax as the dictionary
 * (`"Seite {page} von {pageCount}"`). Overrides the dictionary for that one instance.
 */
export type ComponentLabels<C extends string> = Partial<Record<LabelKey<C>, string>>
