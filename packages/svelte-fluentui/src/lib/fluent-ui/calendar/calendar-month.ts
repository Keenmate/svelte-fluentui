import type {IFluentCalendar} from "./fluent-calendar.js"

export class CalendarMonth {
	private calendar: IFluentCalendar
	private isInDisabledList: boolean
	public month: Date

	constructor(calendar: IFluentCalendar, month: Date) {
		this.calendar = calendar

		const startOfMonth = calendar.calendarExtended.startOfMonth(month)
		const day = month.getDate()
		this.month = day === 1 ? month : startOfMonth

		if (calendar.disabledCheckAllDaysOfMonthYear) {
			const endOfMonth = calendar.calendarExtended.endOfMonth(month)
			this.isInDisabledList = calendar.allDaysAreDisabled(startOfMonth, endOfMonth)
		} else {
			this.isInDisabledList = calendar.disabledDateFunc ? calendar.disabledDateFunc(this.month) : false
		}
	}

	get isReadOnly(): boolean {
		return this.isInDisabledList || this.calendar.readOnly
	}

	get isDisabled(): boolean {
		return this.isInDisabledList
	}

	get isSelected(): boolean {
		const value = this.calendar.value
		if (!value) {
			return false
		}

		return this.month.getFullYear() === value.getFullYear() && this.month.getMonth() === value.getMonth()
	}

	get title(): string {
		const monthName = this.calendar.calendarExtended.getMonthNameFromDate(this.month)
		const year = this.month.getFullYear().toString().padStart(4, "0")
		return `${monthName} ${year}`
	}

	get monthIdentifier(): string {
		const y = this.month.getFullYear()
		const m = (this.month.getMonth() + 1).toString().padStart(2, "0")
		return `${y}-${m}`
	}
}
