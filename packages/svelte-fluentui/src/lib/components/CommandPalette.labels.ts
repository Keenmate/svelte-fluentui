/** Every UI text of CommandPalette; pass a partial object as `labels` to override. */
export type CommandPaletteLabels = {
	/** Accessible name of the palette (`role="dialog"`). An `aria-label` attribute wins. */
	dialog: string
	/** Input placeholder and accessible name. The `placeholder` prop wins when set. */
	placeholder: string
	/** Accessible name of the results listbox. */
	results: string
	/** Hint next to the input. */
	escapeHint: string
	/** Empty state for a query with no matches. The `emptyText` prop wins when set. */
	noMatches: (query: string) => string
	/** Empty state with no query (no items at all). The `emptyText` prop wins when set. */
	noItems: string
	/** Footer hints, shown after their key glyphs. */
	navigateHint: string
	selectHint: string
	toggleHint: string
}

/** CommandPalette's English strings; spread a partial over them via the `labels` prop. */
export const defaultCommandPaletteLabels: CommandPaletteLabels = {
	dialog: "Command palette",
	placeholder: "Search…",
	results: "Command palette results",
	escapeHint: "esc to close",
	noMatches: (query) => `No matches for "${query}"`,
	noItems: "No items",
	navigateHint: "navigate",
	selectHint: "select",
	toggleHint: "toggle"
}
