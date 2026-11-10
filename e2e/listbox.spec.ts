import {test, expect} from "@playwright/test"

/**
 * Listbox selection + binding (2.0.0 Phase 1: value turned into an array in
 * single mode, `multiple` attribute was never set correctly).
 * Fixture: docs/src/routes/test/listbox/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/listbox")
})

test("single: initial value marks the option selected", async ({page}) => {
	const wrap = page.locator("#single-wrap")
	await expect(wrap.getByRole("option", {name: "Bravo"})).toHaveAttribute("aria-selected", "true")
	await expect(page.locator("#single-value")).toHaveText('"b"')
})

test("single: clicking an option binds a string", async ({page}) => {
	const wrap = page.locator("#single-wrap")
	await wrap.getByRole("option", {name: "Alpha"}).click()
	await expect(page.locator("#single-value")).toHaveText('"a"')
	await expect(wrap.getByRole("option", {name: "Alpha"})).toHaveAttribute("aria-selected", "true")
	await expect(wrap.getByRole("option", {name: "Bravo"})).toHaveAttribute("aria-selected", "false")
})

test("single: external assignment updates selection", async ({page}) => {
	const wrap = page.locator("#single-wrap")
	await page.locator("#single-set").click()
	await expect(wrap.getByRole("option", {name: "Charlie"})).toHaveAttribute("aria-selected", "true")
})

test("multi: sets the multiple attribute and binds an array", async ({page}) => {
	const wrap = page.locator("#multi-wrap")
	await expect(wrap.locator("fluent-listbox")).toHaveAttribute("multiple")
	await expect(page.locator("#single-wrap fluent-listbox")).not.toHaveAttribute("multiple")
	await wrap.getByRole("option", {name: "Charlie"}).click()
	await expect(page.locator("#multi-value")).toHaveText('["a","c"]')
})
