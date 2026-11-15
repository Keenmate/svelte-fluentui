/** Every UI text of Chip; pass a partial object as `labels` to override. */
export type ChipLabels = {
	/** Accessible name / tooltip of the × button, from the chip text. The `removeLabel` prop wins when set. */
	remove: (text: string) => string
}

/** Chip's English strings; spread a partial over them via the `labels` prop. */
export const defaultChipLabels: ChipLabels = {
	remove: (text) => `Remove ${text}`
}
