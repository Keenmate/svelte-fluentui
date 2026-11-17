/**
 * How components read their built-in text: the instance's `labels` prop first, then the
 * `svelteFluentUI.<component>.<key>` dictionary entry for the current locale (falling back to
 * English). Reactive — an open component re-renders when the locale changes.
 */
import {format, getMessageFormatter} from "svelte-i18n"
import {fromStore} from "svelte/store"
import {i18n} from "./i18n-service.svelte.js"
import type {ComponentLabels, LabelKey} from "./types.js"

/** ICU values: `{page}`, `{count}`, `{item}`… */
export type TranslationValues = Record<string, string | number | boolean | Date | null | undefined>

/** A component's text lookup: `t("pageInfo", {page, pageCount})`. */
export type Translate<C extends string> = (key: LabelKey<C>, values?: TranslationValues) => string

const formatter = fromStore(format)

/**
 * Text lookup for one component.
 *
 * @example
 * ```ts
 * let {labels, ...} = $props()
 * const t = useTranslations("datePicker", () => labels)
 * // markup: aria-label={t("openPopupAriaLabel")}
 * ```
 */
export function useTranslations<C extends string>(component: C, labels: () => ComponentLabels<C> | undefined): Translate<C> {
	return (key, values) => {
		const own = labels()?.[key]
		if (own != null) {
			if (!values) return own
			return String(getMessageFormatter(own, i18n.currentLocale).format(values))
		}
		return formatter.current(`svelteFluentUI.${component}.${key}`, values ? {values} : undefined)
	}
}
