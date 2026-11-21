/**
 * svelte-fluentui i18n, built on svelte-i18n (same API as svelte-pure-admin's).
 *
 * Import `_`, `locale`, … from here (via "svelte-fluentui"), not from svelte-i18n directly, so the
 * built-in translations are registered first.
 */
export {i18n} from "./i18n-service.svelte.js"
export {useTranslations, type Translate, type TranslationValues} from "./translate.svelte.js"
export type {
	ComponentLabels,
	I18nInitOptions,
	LabelKey,
	Language,
	SvelteFluentUITranslationKey,
	SvelteFluentUITranslations
} from "./types.js"
export {en} from "./locales/en.js"
export {de} from "./locales/de.js"
export {
	_,
	locale,
	locales,
	isLoading,
	addMessages,
	register,
	init,
	getLocaleFromNavigator,
	getLocaleFromQueryString,
	getLocaleFromHash,
	getLocaleFromPathname
} from "svelte-i18n"
