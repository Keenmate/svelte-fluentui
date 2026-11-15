import {test, expect, type Page} from "@playwright/test"

/**
 * DatePicker / TimePicker light dismiss on the shared `dismissOnOutside` helper
 * (2.0.0 Phase 3): outside press closes, focus moving away closes, focus / presses
 * inside the portalled popup (incl. its padding) don't, and inside a Dialog the
 * focus-trap exception keeps day clicks working.
 * Fixture: docs/src/routes/test/popup-pickers/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/popup-pickers")
})

const datePicker = (page: Page) => page.locator(".fluent-datepicker:has(#dp)")
const timePicker = (page: Page) => page.locator(".fluent-timepicker:has(#tp)")
const calendarPopup = (page: Page) => page.locator(".positioning-region:has(.fluent-calendar)")
const day = (page: Page, n: number) =>
	calendarPopup(page).locator(".days [role=gridcell]", {hasText: new RegExp(`^${n}$`)}).first()

async function openDatePicker(page: Page) {
	await datePicker(page).locator(".calendar-button").click()
	await expect(calendarPopup(page)).toBeVisible()
	await expect(page.locator("#dp-open")).toHaveText("true")
}

async function openTimePicker(page: Page) {
	await timePicker(page).locator(".clock-button").click()
	await expect(page.locator(".time-picker-panel")).toBeVisible()
	await expect(page.locator("#tp-open")).toHaveText("true")
}

test("DatePicker: Tab out of the picker closes the calendar; Tab within it doesn't", async ({page}) => {
	await openDatePicker(page)
	await expect(datePicker(page).locator(".calendar-button")).toBeFocused()
	// calendar button → clear button: still inside the picker
	await page.keyboard.press("Tab")
	await expect(datePicker(page).locator(".clear-button")).toBeFocused()
	await expect(page.locator("#dp-open")).toHaveText("true")
	// → next field on the page: focus left the picker
	await page.keyboard.press("Tab")
	await expect(page.locator("#dp-open")).toHaveText("false")
	await expect(calendarPopup(page)).toHaveCount(0)
})

test("DatePicker: focus moving to another field closes the calendar", async ({page}) => {
	await openDatePicker(page)
	await page.locator("#outside").focus()
	await expect(page.locator("#dp-open")).toHaveText("false")
})

test("DatePicker: a press on the popup's padding doesn't close it", async ({page}) => {
	await openDatePicker(page)
	await calendarPopup(page).click({position: {x: 4, y: 4}})
	await expect(page.locator("#dp-open")).toHaveText("true")
	await expect(calendarPopup(page)).toBeVisible()
})

test("DatePicker: keyboard inside the calendar keeps it open; Enter on a day selects", async ({page}) => {
	await openDatePicker(page)
	await day(page, 20).focus()
	await page.keyboard.press("Tab")
	await expect(page.locator("#dp-open")).toHaveText("true")
	await page.keyboard.press("Shift+Tab")
	await expect(day(page, 20)).toBeFocused()
	await page.keyboard.press("Enter")
	await expect(page.locator("#dp-value")).toHaveText("2026-5-20")
	await expect(page.locator("#dp-open")).toHaveText("false")
})

test("DatePicker: clicking a day selects; an outside press closes", async ({page}) => {
	await openDatePicker(page)
	await day(page, 12).click()
	await expect(page.locator("#dp-value")).toHaveText("2026-5-12")
	await expect(page.locator("#dp-open")).toHaveText("false")
	await openDatePicker(page)
	await page.mouse.click(1200, 900)
	await expect(page.locator("#dp-open")).toHaveText("false")
})

test("TimePicker: focus leaving the picker closes the popup", async ({page}) => {
	await openTimePicker(page)
	await expect(timePicker(page).locator(".clock-button")).toBeFocused()
	await page.keyboard.press("Tab")
	await expect(page.locator("#tp-open")).toHaveText("false")
})

test("TimePicker: clicking hour / minute (focus into the popup) keeps it open; OK applies", async ({page}) => {
	await openTimePicker(page)
	const columns = page.locator(".time-picker-panel .time-list")
	await columns.nth(0).locator(".time-option", {hasText: /^09$/}).click()
	await columns.nth(1).locator(".time-option", {hasText: /^30$/}).click()
	await expect(page.locator("#tp-open")).toHaveText("true")
	// Keyboard within the popup: Tab between options doesn't close it
	await page.keyboard.press("Tab")
	await expect(page.locator("#tp-open")).toHaveText("true")
	await page.locator(".time-picker-panel fluent-button", {hasText: "OK"}).click()
	await expect(page.locator("#tp-value")).toHaveText("09:30")
	await expect(page.locator("#tp-open")).toHaveText("false")
})

test("DatePicker in a Dialog: the focus trap doesn't dismiss the calendar; a day click selects", async ({page}) => {
	await page.locator("#open-dialog").click()
	await expect(page.locator("#dialog-open")).toHaveText("true")
	await page.locator(".fluent-datepicker:has(#dialog-dp) .calendar-button").click()
	await expect(page.locator("#dialog-dp-open")).toHaveText("true")
	await day(page, 21).click()
	await expect(page.locator("#dialog-dp-value")).toHaveText("2026-5-21")
	await expect(page.locator("#dialog-dp-open")).toHaveText("false")
	await expect(page.locator("#dialog-open")).toHaveText("true")
})
