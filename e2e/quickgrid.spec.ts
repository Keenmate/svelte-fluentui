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

test("row toolbar: custom item runs onClick then onAction; built-ins report their action", async ({page}) => {
	const row = page.locator("#toolbar-wrap tbody tr", {hasText: "Banana"})
	await row.hover()
	const toolbar = page.locator(".row-toolbar")
	await expect(toolbar.locator(".row-toolbar-btn")).toHaveCount(2)
	await expect(toolbar.locator(".row-toolbar-divider")).toHaveCount(1)
	await toolbar.getByRole("button", {name: "Star"}).click()
	await expect(page.locator("#log")).toContainText("star:Banana | row-toolbar:custom:star@1")
	await row.hover()
	await page.locator(".row-toolbar").getByRole("button", {name: "Delete row"}).click()
	await expect(page.locator("#log")).toContainText("row-toolbar:delete:-@1")
})

test("context menu: dynamic text, hidden items and trailing divider dropped, onAction gets the cell", async ({page}) => {
	await page.locator("#toolbar-wrap td", {hasText: "Cherry"}).click({button: "right"})
	const menu = page.locator(".context-menu fluent-menu")
	await expect(menu.locator("fluent-menu-item")).toHaveCount(1)
	await expect(menu.locator("fluent-divider")).toHaveCount(0)
	await menu.locator("fluent-menu-item", {hasText: "Copy Name"}).click()
	await expect(page.locator("#log")).toContainText("copy:Cherry | context-menu:custom:copy@2")
})

test("a dropdown pick fires onRowChange once; the consumer's change to another field shows", async ({page}) => {
	const wrap = page.locator("#dependent-wrap")
	// Navigate mode (Excel-like): select the cell, Enter opens the select editor's list
	await wrap.locator("td", {hasText: "web"}).click()
	await page.keyboard.press("Enter")
	await page.getByRole("option", {name: "API"}).click()
	await expect(wrap.locator("tbody td").first()).toHaveText("api")
	// The consumer cleared the component; the grid must show its items, not a stale draft.
	await expect(wrap.locator("td", {hasText: "none"})).toBeVisible()
	await page.waitForTimeout(300) // a duplicate commit would arrive on the blur that follows
	await expect(page.locator("#team-log")).toHaveText("team:web->api")
})
