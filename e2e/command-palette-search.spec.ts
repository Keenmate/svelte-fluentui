import {test, expect, type Page} from "@playwright/test"

/**
 * CommandPalette (2.0.0 Phase 3): matching via helpers/text.ts with a
 * `searchBehavior` prop (default "normalized": case + diacritics insensitive),
 * highlight mapped back to the original text, ListNav keyboard cursor.
 * Fixture: docs/src/routes/test/command-palette-search/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/command-palette-search")
})

async function search(page: Page, text: string) {
	if (!(await page.locator(".cp-input").isVisible())) await page.locator("#open").click()
	await expect(page.locator(".cp-input")).toBeFocused()
	await page.locator(".cp-input").fill(text)
}

const options = (page: Page) => page.locator(".cp-results [role=option]")

test("normalized (default): 'cafe' finds and highlights 'Café'", async ({page}) => {
	await search(page, "cafe")
	await expect(options(page)).toHaveCount(1)
	await expect(options(page).first().locator("mark")).toHaveText("Café")
})

test("normalized: diacritics and ß fold, the highlight covers the original letters", async ({page}) => {
	await search(page, "CREME")
	await expect(options(page).first().locator("mark")).toHaveText("Crème")
	await search(page, "strasse")
	await expect(options(page).first().locator("mark")).toHaveText("straße")
	await search(page, "pate")
	await expect(options(page).first().locator("mark")).toHaveText("Pate\u0301")
})

test("case-insensitive: case folds, diacritics don't", async ({page}) => {
	await page.locator("#behavior").selectOption("case-insensitive")
	await search(page, "cafe")
	await expect(options(page)).toHaveCount(0)
	await search(page, "CAFÉ")
	await expect(options(page)).toHaveCount(1)
})

test("exact: case- and diacritic-sensitive", async ({page}) => {
	await page.locator("#behavior").selectOption("exact")
	await search(page, "café")
	await expect(options(page)).toHaveCount(0)
	await search(page, "Café")
	await expect(options(page)).toHaveCount(1)
})

test("arrow keys move the highlight, clamped at both ends; Enter runs the row", async ({page}) => {
	await search(page, "row")
	await expect(options(page)).toHaveCount(5)
	const selected = page.locator(".cp-results [aria-selected=true]")
	await expect(selected).toHaveText("Row 1")
	await page.keyboard.press("ArrowUp")
	await expect(selected).toHaveText("Row 1")
	await page.keyboard.press("ArrowDown")
	await page.keyboard.press("ArrowDown")
	await expect(selected).toHaveText("Row 3")
	for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown")
	await expect(selected).toHaveText("Row 5")
	await page.keyboard.press("PageUp")
	await expect(selected).toHaveText("Row 1")
	await page.keyboard.press("ArrowDown")
	await page.keyboard.press("Enter")
	await expect(page.locator("#log")).toHaveText("row2")
})

test("typing resets the highlight to the first row", async ({page}) => {
	await search(page, "row")
	await page.keyboard.press("ArrowDown")
	await page.keyboard.type(" ")
	await expect(page.locator(".cp-results [aria-selected=true]")).toHaveText("Row 1")
})
