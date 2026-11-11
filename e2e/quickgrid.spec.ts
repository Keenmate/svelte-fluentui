import {test, expect} from "@playwright/test"

/**
 * QuickGrid (2.0.0): getDisplayValueCallback, filterCallback({term, row, column}),
 * beforeCommitCallback, onEditStart / onRowChange / onValidationError.
 * Fixture: docs/src/routes/test/quickgrid/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid")
})

test("getDisplayValueCallback formats cells", async ({page}) => {
	await expect(page.locator("#grid-wrap td", {hasText: "12 pcs"})).toBeVisible()
})

test("filterCallback filters rows; null leaves the filter off", async ({page}) => {
	const filter = page.locator("#grid-wrap .filter-row input").nth(1)
	await filter.fill(">10")
	await expect(page.locator("#grid-wrap td", {hasText: "5 pcs"})).toHaveCount(0)
	await expect(page.locator("#grid-wrap td", {hasText: "40 pcs"})).toBeVisible()
	await filter.fill(">")
	await expect(page.locator("#grid-wrap td", {hasText: "5 pcs"})).toBeVisible()
})

test("editing fires onEditStart, beforeCommitCallback errors fire onValidationError", async ({page}) => {
	await page.locator("#grid-wrap td", {hasText: "Apple"}).dblclick()
	await expect(page.locator("#log")).toContainText("start:name@0")
	await page.keyboard.press("Control+A")
	await page.keyboard.type("A")
	await page.keyboard.press("Enter")
	await expect(page.locator("#log")).toContainText("error:Too short")
	await expect(page.locator("#log")).toContainText("change:A:false")
})
