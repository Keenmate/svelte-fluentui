import type {CalendarView} from "../fluent-ui/calendar/fluent-calendar.js"

/** Every UI text of Calendar; pass a partial object as `labels` to override. Month and weekday names come from `culture`. */
export type CalendarLabels = {
	/** Accessible name / tooltip of the "previous period" arrow. `title` is the localised target (month name, year or year range). */
	previousPeriod: (title: string, view: CalendarView) => string
	/** Accessible name / tooltip of the "next period" arrow. */
	nextPeriod: (title: string, view: CalendarView) => string
	/** `message` of the `onSelectionReject` context when `maxSelectedDayCount` is exceeded. */
	maxSelectedDayCountExceeded: (max: number) => string
}

/** Calendar's English strings; spread a partial over them via the `labels` prop. */
export const defaultCalendarLabels: CalendarLabels = {
	previousPeriod: (title) => title,
	nextPeriod: (title) => title,
	maxSelectedDayCountExceeded: (max) =>
		`You can select a maximum of ${max} day${max === 1 ? "" : "s"}. Delete a day to select a new one.`
}
