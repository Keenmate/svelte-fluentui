/** Every UI text of Alert; pass a partial object as `labels` to override. */
export type AlertLabels = {
	/** Accessible name of the dismiss (×) button (`dismissible`). */
	dismiss: string
}

/** Alert's English strings; spread a partial over them via the `labels` prop. */
export const defaultAlertLabels: AlertLabels = {
	dismiss: "Dismiss"
}
