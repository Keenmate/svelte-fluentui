import {defaultCalendarLabels, type CalendarLabels} from "./Calendar.labels.js"

/** Every UI text of DatePicker (its own plus the popup Calendar's); pass a partial object as `labels` to override. */
export type DatePickerLabels = CalendarLabels & {
	/** Input placeholder. The `placeholder` prop wins when set. */
	placeholder: string
	/** Accessible name of the calendar icon button. The `openCalendarIconAriaLabel` prop wins when set. */
	openCalendar: string
	/** Accessible name of the calendar popup (`role="dialog"`). The `popupAriaLabel` prop wins when set. */
	popup: string
	/** Accessible name of the clear (×) button. */
	clear: string
}

/** DatePicker's English strings; spread a partial over them via the `labels` prop. */
export const defaultDatePickerLabels: DatePickerLabels = {
	...defaultCalendarLabels,
	placeholder: "Select a date",
	openCalendar: "Open calendar",
	popup: "Choose date",
	clear: "Clear date"
}
