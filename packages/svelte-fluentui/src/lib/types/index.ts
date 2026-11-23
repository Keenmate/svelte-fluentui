import type {HTMLAnchorAttributes, HTMLAttributes} from "svelte/elements"

/**
 * Native attributes and DOM events a component forwards to its root element via
 * `...rest`, minus the component's own props. Lowercase `on*` handlers in here
 * are real browser events and receive the native `Event` untouched.
 */
export type RestProps<Own> = Omit<HTMLAttributes<HTMLElement>, keyof Own>

/**
 * `RestProps` for link-like components whose `...rest` lands on (or is forwarded
 * to) an anchor: adds the anchor attributes (`target`, `rel`, `download`,
 * `hreflang`, `referrerpolicy`, …) on top of the global ones, minus the
 * component's own props.
 */
export type AnchorRestProps<Own> = Omit<HTMLAnchorAttributes, keyof Own>

/** A native event handler as forwarded by a component (`oninput`, `onchange`, ...). */
export type NativeEventHandler = (event: Event) => void

/** Layout axis shared by every `orientation` prop (Stack, Divider, RadioGroup, Slider, Tabs, Toolbar, Layout, MultiSplitter, Field, AppBar). */
export type Orientation = "horizontal" | "vertical"

/** One selectable option (Combobox, Autocomplete, …). `T` is the value type. */
export type OptionItem<T = string> = {
	value: T
	label: string
	disabled?: boolean
	/** Optional group heading. Options sharing a `group` are rendered together
	 * under a non-interactive header (Combobox `options` array). */
	group?: string
}

export type SelectedValue = OptionItem["value"][] | undefined | null

/**
 * Context provided by the custom <Accordion> and consumed by each
 * <AccordionItem>. The parent owns the value/multiple state; items read their
 * expanded state and delegate clicks / keyboard nav back to the parent.
 */
export type AccordionSvelteContext = {
	/** Ids of the currently expanded items (length 0 or 1 in single mode). */
	expandedIds: string[]
	/** Side the expand/collapse chevron sits on. */
	togglePosition: "start" | "end"
	/** Whether the given item id is currently expanded. */
	isExpanded(id: string): boolean
	/** Toggle the given item, applying single/multiple expand rules. */
	toggle(id: string): void
	/** An item's `expanded` during the Accordion's first render seeds `value` (ignored when `value` was given, and afterwards). */
	preselect?(id: string): void
	/** Open / close an item from code (an item's `expanded` assigned later); no `onChange`. */
	setExpanded?(id: string, open: boolean): void
	/** Handle Arrow/Home/End roving focus between item headers. */
	onHeaderKeydown(id: string, event: KeyboardEvent): void
}
