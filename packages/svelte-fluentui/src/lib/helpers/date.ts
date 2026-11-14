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

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parses `"yyyy-mm-dd"` as local midnight (`new Date("yyyy-mm-dd")` is UTC midnight —
 *  the previous day west of Greenwich). `null` for anything else or an impossible date. */
export function parseLocalDate(value: string): Date | null {
	const m = ISO_DAY.exec(value)
	if (!m) return null
	const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
	date.setFullYear(Number(m[1]))  // the constructor maps years 0–99 to 1900–1999
	return date.getDate() === Number(m[3]) && date.getMonth() === Number(m[2]) - 1 ? date : null
}

/** Formats the local calendar day of `date` as `"yyyy-mm-dd"` (`toISOString()` gives the
 *  UTC day — the next or previous day away from Greenwich). */
export function formatLocalDate(date: Date): string {
	const pad = (n: number, width = 2) => String(n).padStart(width, "0")
	return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A date-like value (`Date`, timestamp, `"yyyy-mm-dd"` or any `Date`-parsable string) as a
 *  local `"yyyy-mm-dd"`; `""` when it isn't a valid date. */
export function toLocalDateString(value: unknown): string {
	if (value === null || value === undefined || value === "") return ""
	if (typeof value === "string" && ISO_DAY.test(value)) return parseLocalDate(value) ? value : ""
	const date = value instanceof Date ? value : typeof value === "number" || typeof value === "string" ? new Date(value) : null
	return date && !isNaN(date.getTime()) ? formatLocalDate(date) : ""
}
