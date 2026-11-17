/**
 * svelte-fluentui i18n service — a Svelte 5 reactive singleton over svelte-i18n, with the same
 * API as svelte-pure-admin's `i18n` service.
 *
 * Three ways to get translations in:
 * 1. Bundled — built-in `en` / `de`, registered on import (nothing to set up for English).
 * 2. Injected — `init({translations})` / `addTranslations()`.
 * 3. Loaded — `init({loadTranslations})` / `setTranslationLoader()`, run by `setLocale()`.
 *
 * The app's own keys share the same svelte-i18n dictionary and locale, so one `setLocale()`
 * switches the app and the library together.
 */
import {addMessages, init as initSvelteI18n, locale, isLoading as svelteI18nIsLoading} from "svelte-i18n"
import {get} from "svelte/store"
import {en} from "./locales/en.js"
import {de} from "./locales/de.js"
import type {I18nInitOptions, Language} from "./types.js"

const builtInLocales: Record<string, Record<string, string>> = {en, de}

const defaultLanguages: Language[] = [
	{code: "en", label: "English", nativeLabel: "English"},
	{code: "de", label: "German", nativeLabel: "Deutsch"}
]

function normalizeLanguage(lang: string | Language): Language {
	if (typeof lang === "string") return defaultLanguages.find((l) => l.code === lang) ?? {code: lang}
	return lang
}

function createI18nService() {
	let languages = $state<Language[]>([...defaultLanguages])
	let loadedLocales = $state<Set<string>>(new Set(Object.keys(builtInLocales)))
	let loading = $state(false)
	let fallbackLocale = $state("en")
	// Mirrors svelte-i18n's `locale` store so `currentLocale` is reactive in runes code.
	let current = $state("en")
	let loadTranslationsFn: ((locale: string) => Promise<Record<string, string>>) | null = null

	// Auto-initialise on import, so translations work (also during SSR) before the app calls init().
	for (const [code, messages] of Object.entries(builtInLocales)) addMessages(code, messages)
	if (!get(locale)) initSvelteI18n({fallbackLocale: "en", initialLocale: "en"})
	current = get(locale) || "en"
	locale.subscribe((code) => {
		current = code || fallbackLocale
	})

	return {
		/** Current locale code (reactive). */
		get currentLocale(): string {
			return current
		},

		/** Available languages. */
		get languages(): Language[] {
			return languages
		},

		/** True while `setLocale()` loads translations. */
		get isLoading(): boolean {
			return loading || get(svelteI18nIsLoading)
		},

		/** Locale used for missing keys. */
		get fallbackLocale(): string {
			return fallbackLocale
		},

		/** Locales whose translations are loaded. */
		get loadedLocales(): Set<string> {
			return loadedLocales
		},

		/**
		 * Configure locale, languages and translations.
		 *
		 * @example
		 * ```ts
		 * i18n.init({
		 *   locale: "de",
		 *   translations: {de: {"app.title": "Übersicht", "svelteFluentUI.dialog.closeAriaLabel": "Schließen"}},
		 *   loadTranslations: async (locale) => (await fetch(`/locales/${locale}.json`)).json()
		 * })
		 * ```
		 */
		init(options: I18nInitOptions = {}): void {
			const {locale: requestedLocale, fallbackLocale: requestedFallback = "en", languages: available, translations = {}, loadTranslations} = options

			fallbackLocale = requestedFallback
			if (available) languages = available.map(normalizeLanguage)
			loadTranslationsFn = loadTranslations ?? null

			for (const [code, messages] of Object.entries(translations)) {
				addMessages(code, messages)
				loadedLocales = new Set([...loadedLocales, code])
			}

			// Re-run svelte-i18n's init so its fallback locale follows ours.
			initSvelteI18n({fallbackLocale: requestedFallback, initialLocale: requestedLocale ?? (get(locale) || "en")})
		},

		/** Switch locale; loads its translations first when a loader is set and it isn't loaded yet. */
		async setLocale(code: string): Promise<void> {
			if (loadedLocales.has(code)) {
				locale.set(code)
				return
			}
			if (!loadTranslationsFn) {
				console.warn(`[svelte-fluentui i18n] Locale "${code}" is not loaded and no loader is set. Missing keys fall back to "${fallbackLocale}".`)
				locale.set(code)
				return
			}
			loading = true
			try {
				addMessages(code, await loadTranslationsFn(code))
				loadedLocales = new Set([...loadedLocales, code])
				locale.set(code)
			} catch (error) {
				console.error(`[svelte-fluentui i18n] Failed to load translations for "${code}":`, error)
				throw error
			} finally {
				loading = false
			}
		},

		/** A language by code. */
		getLanguage(code: string): Language | undefined {
			return languages.find((l) => l.code === code)
		},

		/** Whether a locale's translations are loaded. */
		isLocaleLoaded(code: string): boolean {
			return loadedLocales.has(code)
		},

		/** Replace the languages list. */
		setLanguages(langs: (string | Language)[]): void {
			languages = langs.map(normalizeLanguage)
		},

		/** Add a language (no-op when it is already listed). */
		addLanguage(lang: string | Language): void {
			const normalized = normalizeLanguage(lang)
			if (!languages.some((l) => l.code === normalized.code)) languages = [...languages, normalized]
		},

		/** Remove a language from the list. */
		removeLanguage(code: string): void {
			languages = languages.filter((l) => l.code !== code)
		},

		/** Add or override translations for a locale without switching to it. */
		addTranslations(code: string, translations: Record<string, string>): void {
			addMessages(code, translations)
			loadedLocales = new Set([...loadedLocales, code])
		},

		/** Set (or clear) the loader `setLocale()` uses for locales not loaded yet. */
		setTranslationLoader(loader: ((locale: string) => Promise<Record<string, string>>) | null): void {
			loadTranslationsFn = loader
		}
	}
}

/**
 * The i18n service.
 *
 * @example Language picker
 * ```svelte
 * <script>
 *   import {i18n} from "svelte-fluentui"
 * </script>
 *
 * <select value={i18n.currentLocale} onchange={(e) => i18n.setLocale(e.currentTarget.value)}>
 *   {#each i18n.languages as lang}
 *     <option value={lang.code}>{lang.nativeLabel ?? lang.code}</option>
 *   {/each}
 * </select>
 * ```
 */
export const i18n = createI18nService()
