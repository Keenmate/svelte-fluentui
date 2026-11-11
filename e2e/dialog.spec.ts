import {test, expect} from "@playwright/test"

/**
 * Dialog focus trap + Escape layering (2.0.0 Phase 1).
 * Fixture: docs/src/routes/test/dialog/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/dialog")
})

test("trapFocus={false} lets focus leave the dialog", async ({page}) => {
	await page.locator("#open-notrap").click()
	await page.locator("#inside-notrap").focus()
	await page.locator("#outside-button").focus()
	await expect(page.locator("#outside-button")).toBeFocused()
})

test("Escape closes the Combobox dropdown first, then the dialog", async ({page}) => {
	await page.locator("#open-combo").click()
	await page.locator("#dialog-combo").click()
	await expect(page.getByRole("option", {name: "Alpha"})).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.getByRole("option", {name: "Alpha"})).toBeHidden()
	await expect(page.locator("#combo-open")).toHaveText("true")
	await page.keyboard.press("Escape")
	await expect(page.locator("#combo-open")).toHaveText("false")
})

test("Escape closes the Select dropdown, not the dialog", async ({page}) => {
	await page.locator("#open-combo").click()
	await page.locator("#dialog-select").click()
	await expect(page.getByRole("option", {name: "Xray"})).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.getByRole("option", {name: "Xray"})).toBeHidden()
	await expect(page.locator("#combo-open")).toHaveText("true")
})

test("Escape closes the DatePicker calendar, not the dialog", async ({page}) => {
	await page.locator("#open-combo").click()
	await page.locator("fluent-dialog .calendar-button").click()
	await expect(page.locator(".fluent-calendar")).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.locator(".fluent-calendar")).toHaveCount(0)
	await expect(page.locator("#combo-open")).toHaveText("true")
})

test("beforeCloseCallback can veto; onOpenChange fires on close", async ({page}) => {
	await page.locator("#open-guarded").click()
	await page.keyboard.press("Escape")
	await expect(page.locator("#guard-log")).toHaveText("before:escape")
	await expect(page.locator("#guarded-open")).toHaveText("true")
	await page.locator("#allow-close").click()
	await page.getByRole("button", {name: "Close dialog"}).last().click()
	await expect(page.locator("#guarded-open")).toHaveText("false")
	await expect(page.locator("#guard-log")).toHaveText("before:escape,before:close-button,open:false")
})
