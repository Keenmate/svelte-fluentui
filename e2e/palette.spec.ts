import {test, expect} from "@playwright/test"

/**
 * CommandPalette on the action-item model (2.0.0): onClick + onAction with {term},
 * beforeActionCallback vetoing a navigation row, filterCallback({items, term}).
 * Fixture: docs/src/routes/test/palette/+page.svelte
 */

async function openAndType(page, text: string) {
	await page.locator("#open").click()
	const input = page.locator(".cp-input")
	await expect(input).toBeFocused()
	await input.fill(text)
}

test.beforeEach(async ({page}) => {
	await page.goto("/test/palette")
})

test("action row runs onClick then onAction with the search term", async ({page}) => {
	await openAndType(page, "new")
	await page.getByRole("option", {name: /New document/}).click()
	await expect(page.locator("#log")).toHaveText("click:new | action:new:new")
})

test("beforeActionCallback can veto a navigation row; allowed rows still navigate", async ({page}) => {
	await openAndType(page, "go")
	await page.getByRole("option", {name: /Go somewhere/}).click()
	await expect(page).toHaveURL(/\/test\/palette$/)
	await page.keyboard.press("Escape")
	await page.locator("#allow-links").click()
	await openAndType(page, "go")
	await page.getByRole("option", {name: /Go somewhere/}).click()
	await expect(page).toHaveURL(/\/test\/menus$/)
})

test("disabled rows don't run", async ({page}) => {
	await openAndType(page, "disabled")
	await page.getByRole("option", {name: /Disabled thing/}).click({force: true})
	await expect(page.locator("#log")).toHaveText("")
})
