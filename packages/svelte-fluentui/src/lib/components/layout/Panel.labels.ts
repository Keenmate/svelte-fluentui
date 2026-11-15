/** Every UI text of Panel; pass a partial object as `labels` to override. */
export type PanelLabels = {
	/** Accessible name of the overlay (clicking it closes the panel). */
	close: string
}

/** Panel's English strings; spread a partial over them via the `labels` prop. */
export const defaultPanelLabels: PanelLabels = {
	close: "Close panel"
}
