/**
 * Internal (AppBar ↔ AppBarItem): items register with the bar so it can tell which ones
 * don't fit and list them in the "…" overflow popover. Not exported from the package.
 */
import type {Snippet} from "svelte"
import type {Orientation} from "../../types/index.js"

export const APP_BAR_CONTEXT = "fluent-appbar"

export type AppBarEntry = {
	id: string
	/** The item's root element in the bar (observed for overflow, sorted by DOM order). */
	element: HTMLElement
	/** Plain label text, for the popover search. */
	getText: () => string
	/** The item rendered as a popover tile (no id, no active indicator; closes the popover on click). */
	popoverTile: Snippet
}

export type AppBarContext = {
	readonly orientation: Orientation
	register: (entry: AppBarEntry) => () => void
	isOverflowed: (id: string) => boolean
	closeOverflow: () => void
}
