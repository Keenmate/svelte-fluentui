/** Every UI text of BadgeGroup; pass a partial object as `labels` to override. */
export type BadgeGroupLabels = {
	/** Collapsed toggle text, from the hidden count. The `moreLabel` prop wins when set. */
	more: (hiddenCount: number) => string
	/** Expanded toggle text. The `lessLabel` prop wins when set. */
	less: string
}

/** BadgeGroup's English strings; spread a partial over them via the `labels` prop. */
export const defaultBadgeGroupLabels: BadgeGroupLabels = {
	more: (hiddenCount) => `+${hiddenCount} more`,
	less: "Show less"
}
