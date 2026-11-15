/** Every UI text of ToastContainer; pass a partial object as `labels` to override. */
export type ToastContainerLabels = {
	/** Accessible name of each toast's close (×) button. */
	close: string
}

/** ToastContainer's English strings; spread a partial over them via the `labels` prop. */
export const defaultToastContainerLabels: ToastContainerLabels = {
	close: "Close"
}
