/** Every UI text of CompositeBadge; pass a partial object as `labels` to override. */
export type CompositeBadgeLabels = {
	/** Accessible name of the default × button (no `button` snippet). The `buttonTitle` prop wins when set. */
	dismiss: string
}

/** CompositeBadge's English strings; spread a partial over them via the `labels` prop. */
export const defaultCompositeBadgeLabels: CompositeBadgeLabels = {
	dismiss: "Dismiss"
}
