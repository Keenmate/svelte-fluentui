/**
 * Every parent → child context the library uses, in one place.
 *
 * Keys are Symbols, so they can't collide with a consumer's own `setContext("grid", …)`,
 * and each context has a typed `get`/`set` pair instead of `getContext<any>("…")`.
 * (Svelte 5.40's `createContext` does the same; the peer floor is 5.29.)
 */
import {getContext, setContext} from "svelte"
import type {AccordionSvelteContext} from "./types/index.js"
import type {SelectedOptionSvelteContext} from "./types/combobox.js"
import type {MultiSplitterContext} from "./types/multi-splitter.js"
import type {GridBreakpoints} from "./components/layout/containerQueries.js"
import type {TabsContext} from "./components/Tabs.svelte"

function defineContext<T>(name: string) {
	const key = Symbol(name)
	return {
		/** Provide the context to descendants. Call during component init. */
		set: (value: T): T => setContext(key, value),
		/** Read the nearest provider's value; `undefined` outside one. Call during component init. */
		get: (): T | undefined => getContext<T | undefined>(key),
		/** Like `get`, but throws `message` when there is no provider. */
		getRequired: (message: string): T => {
			const value = getContext<T | undefined>(key)
			if (value === undefined) throw new Error(message)
			return value
		}
	}
}

export type GridContext = {
	readonly currentSize: string | undefined
	readonly adaptiveRendering: boolean
	readonly container?: boolean
	readonly cqName?: string
	readonly external?: boolean
	readonly breakpoints?: GridBreakpoints
	readonly explicitBreakpoints?: boolean
}

export type RadioGroupContext = {
	readonly value: string | null | undefined
	setValue: (value: string) => void
}

/** Accordion → AccordionItem */
export const accordionContext = defineContext<AccordionSvelteContext>("fluent-accordion")
/** Select / Combobox / Listbox → Option (which values are selected, toggle one) */
export const selectedOptionsContext = defineContext<SelectedOptionSvelteContext>("fluent-selected-options")
/** Grid → GridItem */
export const gridContext = defineContext<GridContext>("fluent-grid")
/** MultiSplitter → MultiSplitterPane */
export const multiSplitterContext = defineContext<MultiSplitterContext>("fluent-multi-splitter")
/** RadioGroup → Radio */
export const radioGroupContext = defineContext<RadioGroupContext>("fluent-radio-group")
/** Tabs → Tab */
export const tabsContext = defineContext<TabsContext>("fluent-tabs")
