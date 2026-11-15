/** Every UI text of Dialog; pass a partial object as `labels` to override. */
export type DialogLabels = {
	/** Accessible name of the header / floating close (×) button. */
	close: string
	/** Text of the footer button rendered by `dismissible`. The `dismissButtonText` snippet wins when set. */
	dismiss: string
}

/** Dialog's English strings; spread a partial over them via the `labels` prop. */
export const defaultDialogLabels: DialogLabels = {
	close: "Close dialog",
	dismiss: "Dismiss"
}
