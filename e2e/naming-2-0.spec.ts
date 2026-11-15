import {test, expect, type Page} from "@playwright/test"

/**
 * 2.0.0 naming revision: the renamed props work under their new names —
 * `emptyText` / `empty` (Combobox, CommandPalette), `closeOnSelect` (Combobox
 * multiple, DatePicker) and `searchDelay` (Search).
 * Fixture: docs/src/routes/test/naming-2-0/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/naming-2-0")
})

const listbox = (page: Page) => page.locator(".combobox-listbox")

test("Combobox emptyText shows when nothing matches", async ({page}) => {
	const input = page.locator("#empty-text")
	await input.click()
	await input.fill("zzz")
	await expect(listbox(page).locator(".combobox-no-data")).toHaveText("Nothing here")
})

test("Combobox empty snippet renders when nothing matches", async ({page}) => {
	const input = page.locator("#empty-snippet")
	await input.click()
	await input.fill("zzz")
	await expect(listbox(page).locator(".custom-empty")).toHaveText("Custom empty")
})

test("Combobox multiple: default closeOnSelect keeps the list open after a pick", async ({page}) => {
	await page.locator("#multi-default").click()
	await expect(page.locator("#multi-default-open")).toHaveText("true")
	await listbox(page).getByRole("option", {name: "Bravo"}).click()
	await expect(page.locator("#multi-default-value")).toHaveText("b")
	await expect(page.locator("#multi-default-open")).toHaveText("true")
	await expect(listbox(page)).toBeVisible()
})

test("Combobox multiple: closeOnSelect={true} closes the list after a pick", async ({page}) => {
	await page.locator("#multi-close").click()
	await expect(page.locator("#multi-close-open")).toHaveText("true")
	await listbox(page).getByRole("option", {name: "Bravo"}).click()
	await expect(page.locator("#multi-close-value")).toHaveText("b")
	await expect(page.locator("#multi-close-open")).toHaveText("false")
})

test("DatePicker closeOnSelect={false} stays open after a day pick", async ({page}) => {
	await page.locator(".fluent-datepicker:has(#dp) .calendar-button").click()
	const popup = page.locator(".positioning-region:has(.fluent-calendar)")
	await expect(popup).toBeVisible()
	await popup.locator(".days [role=gridcell]", {hasText: /^12$/}).first().click()
	await expect(page.locator("#dp-value")).toHaveText("2026-5-12")
	await expect(page.locator("#dp-open")).toHaveText("true")
	await expect(popup).toBeVisible()
})

test("Search searchDelay debounces onSearch", async ({page}) => {
	await page.locator("#search input").pressSequentially("abc", {delay: 30})
	await page.waitForTimeout(200)
	await expect(page.locator("#terms")).toHaveText("")
	await expect(page.locator("#terms")).toHaveText("abc")
})

test("CommandPalette emptyText is shown when nothing matches", async ({page}) => {
	await page.locator("#open-palette").click()
	await expect(page.locator(".cp-input")).toBeFocused()
	await page.locator(".cp-input").fill("zzz")
	await expect(page.locator(".cp-empty")).toHaveText("Nothing matches")
})
