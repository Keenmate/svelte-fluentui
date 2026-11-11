import type {OptionItem, SelectedValue} from "./index.js"

export type ValueType = string | string[] | null | undefined

export type SelectedOptionSvelteContext = {
	value: SelectedValue
	set(val: ValueType): void
	toggle(val: OptionItem["value"]): void
}

/** Option passed to a Combobox `filterCallback`. Extends OptionItem with the
 * optional per-option `data` payload (from `<Option data={...}>`). */
export type ComboboxFilterOption = OptionItem & {
	data?: Record<string, unknown>
}

/** Custom client-side matcher for Combobox (`filterCallback`). Return true to keep the
 * option visible for the search term. Ignored when `onSearch` is provided (server-side). */
export type ComboboxFilter = (ctx: {term: string; option: ComboboxFilterOption}) => boolean
