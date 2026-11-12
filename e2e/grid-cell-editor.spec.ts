import {test, expect} from "@playwright/test"

/**
 * QuickGrid select editor: keyboard highlight scrolls into view (2.0.0 Phase 1:
 * it never scrolled — the portalled dropdown was looked up inside the editor,
 * and the lookup ran before the DOM update).
 * Fixture: docs/src/routes/test/grid-cell-editor/+page.svelte
 */

test("ArrowDown keeps the highlighted option visible", async ({page}) => {
	await page.goto("/test/grid-cell-editor")
	await page.locator("#grid-wrap td", {hasText: "v0"}).first().dblclick()
	await page.keyboard.press("Enter")
	const dropdown = page.locator(".cell-dropdown")
	await expect(dropdown).toBeVisible()
	for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowDown")

	const highlighted = dropdown.locator(".cell-dropdown-option.highlighted")
	await expect(highlighted).toHaveText("Option 20")
	await expect
		.poll(async () =>
			dropdown.evaluate((d) => {
				const h = d.querySelector(".cell-dropdown-option.highlighted")!.getBoundingClientRect()
				const r = d.getBoundingClientRect()
				return h.top >= r.top && h.bottom <= r.bottom + 1
			})
		)
		.toBe(true)
})

test("typing a letter on a closed select editor opens it on the matching option", async ({page}) => {
	await page.goto("/test/grid-cell-editor")
	await page.locator("#grid-wrap td", {hasText: "apple"}).first().dblclick()
	await expect(page.locator(".cell-select-trigger")).toBeFocused()
	await page.keyboard.press("c")
	const dropdown = page.locator(".cell-dropdown")
	await expect(dropdown).toBeVisible()
	await expect(dropdown.locator(".cell-dropdown-option.highlighted")).toHaveText("Cherry")
})
