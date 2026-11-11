import type {HTMLAttributes} from "svelte/elements"

/**
 * Native attributes and DOM events a component forwards to its root element via
 * `...rest`, minus the component's own props. Lowercase `on*` handlers in here
 * are real browser events and receive the native `Event` untouched.
 */
export type RestProps<Own> = Omit<HTMLAttributes<HTMLElement>, keyof Own>

/** A native event handler as forwarded by a component (`oninput`, `onchange`, ...). */
export type NativeEventHandler = (event: Event) => void

export type OptionItem = {
	value: string
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
	/** Handle Arrow/Home/End roving focus between item headers. */
	onHeaderKeydown(id: string, event: KeyboardEvent): void
}
