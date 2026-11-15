/** Every UI text of TimePicker; pass a partial object as `labels` to override. */
export type TimePickerLabels = {
	/** Input placeholder. The `placeholder` prop wins when set. */
	placeholder: string
	/** Accessible name of the clock button. The `openClockIconAriaLabel` prop wins when set. */
	openPicker: string
	/** Accessible name of the time popup (`role="dialog"`). The `popupAriaLabel` prop wins when set. */
	popup: string
	/** Accessible name of the clear (×) button. */
	clear: string
	/** Column headings (also the radiogroup names). */
	hour: string
	minute: string
	second: string
	period: string
	/** AM / PM — shown in the period column and the input (12-hour clock). */
	am: string
	pm: string
	/** Apply button text. */
	apply: string
}

/** TimePicker's English strings; spread a partial over them via the `labels` prop. */
export const defaultTimePickerLabels: TimePickerLabels = {
	placeholder: "Select time",
	openPicker: "Open time picker",
	popup: "Choose time",
	clear: "Clear time",
	hour: "Hour",
	minute: "Minute",
	second: "Second",
	period: "Period",
	am: "AM",
	pm: "PM",
	apply: "OK"
}
