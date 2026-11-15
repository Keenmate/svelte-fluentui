import {test, expect, type Page} from "@playwright/test"

/**
 * Picker a11y (2.0.0 Phase 3): DatePicker / TimePicker trigger + dialog popup
 * semantics and focus movement (APG date-picker dialog), Calendar grid semantics
 * with a roving tabindex (APG grid), `checkIfSelectedValueHasChanged`.
 * Fixture: docs/src/routes/test/a11y-pickers/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/a11y-pickers")
})

const calendarButton = (page: Page) => page.locator(".fluent-datepicker:has(#dp) .calendar-button")
const clockButton = (page: Page) => page.locator(".fluent-timepicker:has(#tp) .clock-button")
const focusedValue = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.value ?? null)

test("DatePicker: the calendar button announces a dialog popup", async ({page}) => {
	const button = calendarButton(page)
	await expect(button).toHaveAttribute("aria-haspopup", "dialog")
	await expect(button).toHaveAttribute("aria-expanded", "false")
	await button.click()
	await expect(button).toHaveAttribute("aria-expanded", "true")
	const popup = page.locator(`[id="${await button.getAttribute("aria-controls")}"]`)
	await expect(popup).toHaveAttribute("role", "dialog")
	await expect(popup).toHaveAttribute("aria-label", "Choose date")
})

test("DatePicker: keyboard open moves focus into the calendar; Escape returns it", async ({page}) => {
	await calendarButton(page).focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#dp-open")).toHaveText("true")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-10")

	await page.keyboard.press("ArrowRight")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-11")
	await page.keyboard.press("Escape")
	await expect(page.locator("#dp-open")).toHaveText("false")
	await expect(calendarButton(page)).toBeFocused()
})

test("DatePicker: Enter on a focused day picks it and focus returns to the button", async ({page}) => {
	await calendarButton(page).focus()
	await page.keyboard.press("Enter")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-10")
	await page.keyboard.press("ArrowDown")
	await page.keyboard.press("Enter")
	await expect(page.locator("#dp-value")).toHaveText("2026-5-17")
	await expect(page.locator("#dp-open")).toHaveText("false")
	await expect(calendarButton(page)).toBeFocused()
})

test("DatePicker: ArrowDown on the input opens the calendar with focus inside", async ({page}) => {
	await page.locator("#dp").focus()
	await page.keyboard.press("ArrowDown")
	await expect(page.locator("#dp-open")).toHaveText("true")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-10")
})

test("TimePicker: dialog popup; keyboard open focuses the hour column; arrows select; Escape returns focus", async ({page}) => {
	const button = clockButton(page)
	await expect(button).toHaveAttribute("aria-haspopup", "dialog")
	await button.focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#tp-open")).toHaveText("true")
	const panel = page.locator(".time-picker-panel")
	await expect(panel).toHaveAttribute("role", "dialog")

	const hours = panel.getByRole("radiogroup", {name: "Hour"})
	const checkedHour = hours.locator("[role=radio][aria-checked=true]")
	await expect(checkedHour).toHaveText("09")
	await expect(checkedHour).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(checkedHour).toHaveText("10")
	await expect(checkedHour).toBeFocused()
	// Tab moves to the next column's single tab stop (the selected minute).
	await page.keyboard.press("Tab")
	await expect(panel.getByRole("radiogroup", {name: "Minute"}).locator("[aria-checked=true]")).toBeFocused()

	await page.keyboard.press("Escape")
	await expect(page.locator("#tp-open")).toHaveText("false")
	await expect(button).toBeFocused()
})

test("Calendar: grid semantics, one tab stop, today / selected / disabled states", async ({page}) => {
	const grid = page.locator("#cal [role=grid]")
	await expect(grid).toHaveAccessibleName(/2026/)
	await expect(grid.locator("[role=row]")).toHaveCount(7)
	await expect(grid.locator("[role=columnheader]")).toHaveCount(7)
	await expect(grid.locator("[role=gridcell][tabindex='0']")).toHaveCount(1)
	await expect(grid.locator("[role=gridcell][tabindex='0']")).toHaveAttribute("data-value", "2026-05-10")
	await expect(grid.locator("[data-value='2026-05-10']")).toHaveAttribute("aria-selected", "true")
	await expect(grid.locator("[data-value='2026-05-15']")).toHaveAttribute("aria-disabled", "true")

	const today = new Date()
	const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
	await expect(page.locator(`#cal-today [data-value='${todayId}']`)).toHaveAttribute("aria-current", "date")
})

test("Calendar: arrows / Home / End / PageUp / PageDown move the focused date", async ({page}) => {
	await page.locator("#cal [role=gridcell][tabindex='0']").focus()
	await page.keyboard.press("ArrowDown")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-17")
	await page.keyboard.press("ArrowLeft")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-16")
	await page.keyboard.press("ArrowUp")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-09")

	// Home / End stay inside the week row.
	const row = page.locator("#cal [role=row]:has([data-value='2026-05-09']) [role=gridcell]")
	await page.keyboard.press("Home")
	await expect.poll(() => focusedValue(page)).toBe(await row.first().getAttribute("data-value"))
	await page.keyboard.press("End")
	await expect.poll(() => focusedValue(page)).toBe(await row.last().getAttribute("data-value"))

	// PageDown pages the month along (day clamped); the focused cell stays the only tab stop.
	await page.locator("#cal [data-value='2026-05-31']").focus()
	await page.keyboard.press("PageDown")
	await expect.poll(() => focusedValue(page)).toBe("2026-06-30")
	await expect(page.locator("#cal-month")).toHaveText("2026-6")
	await expect(page.locator("#cal [role=gridcell][tabindex='0']")).toHaveCount(1)
	await page.keyboard.press("Shift+PageUp")
	await expect.poll(() => focusedValue(page)).toBe("2025-06-30")

	// Enter selects the focused date; a disabled date can't be selected.
	await page.keyboard.press("PageDown")
	await page.keyboard.press("Enter")
	await expect(page.locator("#cal-value")).toHaveText("2025-7-30")
})

test("Calendar: disabled dates are skipped by Enter; title opens the month picker with focus", async ({page}) => {
	await page.locator("#cal [data-value='2026-05-15']").focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#cal-changes")).toHaveText("0")

	await page.locator("#cal [part=label][role=button]").first().focus()
	await page.keyboard.press("Enter")
	// Months view: focus lands on the selected month, arrows move through the cells.
	await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-pressed"))).toBe("true")
	await page.keyboard.press("ArrowRight")
	await page.keyboard.press("Enter")
	// Back in the days view, focus is on the grid again.
	await expect(page.locator("#cal-month")).toHaveText("2026-6")
	await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("role"))).toBe("gridcell")
})

test("Calendar: the next-period button is named after the next month", async ({page}) => {
	await expect(page.locator("#cal .next")).toHaveAccessibleName(/June|červen|Juni/i)
})

test("Calendar: checkIfSelectedValueHasChanged skips onChange for the same date", async ({page}) => {
	await page.locator("#cal-strict [data-value='2026-05-10']").click()
	await expect(page.locator("#strict-changes")).toHaveText("0")
	await page.locator("#cal-strict [data-value='2026-05-11']").click()
	await expect(page.locator("#strict-changes")).toHaveText("1")
})
