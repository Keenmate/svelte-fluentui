/** Every UI text of Combobox; pass a partial object as `labels` to override. */
export type ComboboxLabels = {
	/** Dropdown message when the filter matches nothing. The `emptyText` prop wins when set. */
	emptyText: string
	/** Dropdown message while `loading` / a search is pending. The `loadingText` prop wins when set. */
	loadingText: string
	/** Accessible name / tooltip of a selected-value chip's × button (multiple mode). */
	removeChip: (label: string) => string
}

/** Combobox's English strings; spread a partial over them via the `labels` prop. */
export const defaultComboboxLabels: ComboboxLabels = {
	emptyText: "No results found",
	loadingText: "Searching…",
	removeChip: (label) => `Remove ${label}`
}
