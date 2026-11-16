/** Every UI text of Select; pass a partial object as `labels` to override. */
export type SelectLabels = {
	/** Tooltip of the `showClear` (×) button. */
	clearSelection: string
}

/** Select's English strings; spread a partial over them via the `labels` prop. */
export const defaultSelectLabels: SelectLabels = {
	clearSelection: "Clear selection"
}
