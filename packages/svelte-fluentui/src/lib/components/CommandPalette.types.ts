import type {ActionEventDetail, ActionItem} from "../action-items/index.js"

/** The palette's surface context: the current search term. */
export type CommandPaletteContext = {term: string}

/**
 * A palette entry: an action item (`text`, `icon`, `isDisabled`, `onClick`, `shortcut`, …)
 * plus palette fields. Entries are either *navigation* (carry an `href`, rendered as a real
 * `<a>` so the host router handles the click) or *actions* (run `onClick`).
 */
export type CommandPaletteItem = ActionItem<CommandPaletteContext> & {
	/** Primary line. */
	text: string
	/** Secondary muted line (e.g. "SKU: MBP-16-001 • $2,499.00"). */
	meta?: string
	/** Trailing badge text (e.g. "In Stock"). */
	badge?: string
	/** Section heading on the idle/home screen; rendered as a trailing chip in search results. */
	group?: string
	/** Extra search terms / aliases that match but aren't shown. */
	keywords?: string[]
	/** Navigation target. Rendered as an `<a>` so the host router handles the click. */
	href?: string
	/** Anchor target (e.g. "_blank"). Only meaningful with `href`. */
	target?: string
	/** Anchor rel. Only meaningful with `href`. */
	rel?: string
}

/** What `onAction`, `beforeActionCallback` and an item's `onClick` receive; `item` is the palette item. */
export type CommandPaletteActionDetail = ActionEventDetail<CommandPaletteContext> & {item: CommandPaletteItem}

/**
 * Custom filter/rank hook (`filterCallback`). Receives the full item list and the trimmed
 * search term, returns the items to show in result order. Overrides the built-in fuzzy
 * scorer entirely — the escape hatch for app-specific search.
 */
export type CommandPaletteFilter = (ctx: {items: CommandPaletteItem[]; term: string}) => CommandPaletteItem[]
