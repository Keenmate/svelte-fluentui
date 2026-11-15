/** Every UI text of Autocomplete; pass a partial object as `labels` to override. */
export type AutocompleteLabels = {
	/** Input placeholder. The `placeholder` prop wins when set. */
	placeholder: string
	/** Dropdown message when the search matches nothing. The `emptyText` prop wins when set. */
	emptyText: string
	/** Accessible name of the loading spinner. */
	loading: string
	/** Accessible name / tooltip of the single-select clear (×) button. */
	clearSelection: string
	/** Accessible name of the magnifier toggle while the dropdown is closed / open. */
	showOptions: string
	closeOptions: string
	/** Accessible name / tooltip of a selected-value chip's × button. */
	removeChip: (label: string) => string
	/** Status message once `maxSelectionCount` is reached. */
	maxSelectionReached: (max: number) => string
}

/** Autocomplete's English strings; spread a partial over them via the `labels` prop. */
export const defaultAutocompleteLabels: AutocompleteLabels = {
	placeholder: "Type to search...",
	emptyText: "No results found",
	loading: "Loading",
	clearSelection: "Clear selection",
	showOptions: "Show options",
	closeOptions: "Close options",
	removeChip: (label) => `Remove ${label}`,
	maxSelectionReached: (max) => `Maximum ${max} selection${max !== 1 ? "s" : ""} reached`
}
