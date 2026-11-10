/** Calendar-day number (local time) — compares dates by day, ignoring the time of day. */
export function dayKey(date: Date): number {
	return date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate()
}

/** True when `date` falls on an earlier calendar day than `other`. */
export function isBeforeDay(date: Date, other: Date): boolean {
	return dayKey(date) < dayKey(other)
}

/** True when `date` falls on a later calendar day than `other`. */
export function isAfterDay(date: Date, other: Date): boolean {
	return dayKey(date) > dayKey(other)
}
