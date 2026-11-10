import {test, expect} from "@playwright/test"

/**
 * Textarea two-way binding (2.0.0 Phase 1: typing used to leave the bound
 * value stale). Fixture: docs/src/routes/test/textarea/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/textarea")
})

test("typing updates the bound value", async ({page}) => {
	const inner = page.locator("#bind-textarea textarea")
	await inner.fill("hello world")
	await expect(page.locator("#bind-value")).toHaveText("hello world")
})

test("assigning the bound value updates the control", async ({page}) => {
	await page.locator("#bind-reset").click()
	await expect(page.locator("#bind-textarea textarea")).toHaveValue("reset")
})
