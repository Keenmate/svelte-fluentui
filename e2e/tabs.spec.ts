import {test, expect} from "@playwright/test"

/**
 * Tabs (2.0.0): beforeLeaveCallback / beforeCloseCallback veto with `false`,
 * onActiveIdChange({activeId, oldActiveId, tab}), onTabClose({tab}).
 * Fixture: docs/src/routes/test/tabs/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/tabs")
})

test("beforeLeaveCallback returning false keeps the active tab", async ({page}) => {
	await page.getByRole("tab", {name: "Bravo"}).click()
	await expect(page.locator("#log")).toContainText("leave?a->b")
	await expect(page.locator("#active")).toHaveText("a")
	await expect(page.locator("#log")).not.toContainText("active:")
})

test("undefined from beforeLeaveCallback continues; onActiveIdChange carries the tab", async ({page}) => {
	await page.locator("#toggle-block").click()
	await page.getByRole("tab", {name: "Bravo"}).click()
	await expect(page.locator("#active")).toHaveText("b")
	await expect(page.locator("#log")).toContainText("active:a->b:2")
})

test("beforeCloseCallback resolving false vetoes; otherwise onTabClose fires", async ({page}) => {
	const closeOf = (name: string) => page.getByRole("tab", {name}).locator("[aria-label='Close tab']")
	await closeOf("Bravo").click()
	await closeOf("Charlie").click()
	await expect(page.locator("#log")).toContainText("close:c")
	await expect(page.locator("#log")).not.toContainText("close:b")
})
