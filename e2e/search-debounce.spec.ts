import {test, expect} from "@playwright/test"

/**
 * Search (2.0.0 Phase 3): `immediate` + `immediateDelay` debounce onSearch via
 * helpers/debounce.ts; a pending call is dropped on unmount.
 * Fixture: docs/src/routes/test/search-debounce/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/search-debounce")
})

test("fast typing fires onSearch once, with the last term, after the delay", async ({page}) => {
	await page.locator("#debounced input").pressSequentially("abc", {delay: 30})
	await page.waitForTimeout(200)
	await expect(page.locator("#terms")).toHaveText("")
	await expect(page.locator("#terms")).toHaveText("abc")
	await page.waitForTimeout(600)
	await expect(page.locator("#terms")).toHaveText("abc")
})

test("unmounting drops a pending onSearch", async ({page}) => {
	await page.locator("#debounced input").pressSequentially("xy", {delay: 30})
	await page.locator("#unmount").click()
	await page.waitForTimeout(700)
	await expect(page.locator("#terms")).toHaveText("")
})
