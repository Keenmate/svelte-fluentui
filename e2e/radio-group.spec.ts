import {test, expect} from "@playwright/test"

/**
 * RadioGroup binding (2.0.0 Phase 1: arrow-key selection didn't update the
 * bound value). Fixture: docs/src/routes/test/radio-group/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/radio-group")
})

test("click updates the bound value once", async ({page}) => {
	await page.locator("#group-wrap fluent-radio[current-value=b]").click()
	await expect(page.locator("#group-value")).toHaveText("b")
	await expect(page.locator("#group-changes")).toHaveText("b")
})

test("arrow keys update the bound value", async ({page}) => {
	await page.locator("#group-wrap fluent-radio[current-value=a]").click()
	await page.keyboard.press("ArrowRight")
	await expect(page.locator("#group-wrap fluent-radio[current-value=b]")).toHaveAttribute("aria-checked", "true")
	await expect(page.locator("#group-value")).toHaveText("b")
})
