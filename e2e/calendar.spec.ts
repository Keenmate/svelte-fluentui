import {test, expect} from "@playwright/test"

/**
 * Calendar (2.0.0): one onChange({value}) for every selectMode, bindable value /
 * selectedDates, onPickerMonthChange({pickerMonth}), month picker via the title.
 * Fixture: docs/src/routes/test/calendar/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/calendar")
})

const day = (page, section: string, n: number) =>
	page.locator(`#${section} .days [role=button]`, {hasText: new RegExp(`^${n}$`)}).first()

test("single: click binds value and fires onChange({value})", async ({page}) => {
	await day(page, "single", 15).click()
	await expect(page.locator("#single-value")).toHaveText("2026-6-15")
	await expect(page.locator("#single-log")).toHaveText("2026-6-15")
})

test("multiple: clicks bind selectedDates and fire onChange with the array", async ({page}) => {
	await day(page, "multi", 3).click()
	await day(page, "multi", 4).click()
	await expect(page.locator("#multi-count")).toHaveText("2")
	await expect(page.locator("#multi-log")).toHaveText("1,2")
})

test("title opens the month picker; picking a month moves pickerMonth", async ({page}) => {
	await page.locator("#single [part=label][role=button]").first().click()
	await page.locator("#single [role=button]", {hasText: /^(Aug|srp|aug)/i}).first().click()
	await expect(page.locator("#picker-month")).toHaveText(/^2026-8-/)
	// the month picker must not change the selected date
	await expect(page.locator("#single-log")).toHaveText("")
})

test("next button fires onPickerMonthChange({pickerMonth})", async ({page}) => {
	await page.locator("#single .next").first().click()
	await expect(page.locator("#month-log")).toHaveText(/^2026-7-/)
})
