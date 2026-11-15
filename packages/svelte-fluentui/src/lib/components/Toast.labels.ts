/** Every UI text of Toast; pass a partial object as `labels` to override. */
export type ToastLabels = {
	/** Accessible name of the dismiss (×) button (`topCTAType="dismiss"`). */
	dismiss: string
	/** Tooltip of the dismiss (×) button. */
	dismissTitle: string
}

/** Toast's English strings; spread a partial over them via the `labels` prop. */
export const defaultToastLabels: ToastLabels = {
	dismiss: "Dismiss",
	dismissTitle: "Close"
}
