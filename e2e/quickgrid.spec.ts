import {test, expect, type Locator} from "@playwright/test"

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
	await expect(page.locator("#log")).toContainText("start:name@0/0/1")
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
	await expect(page.locator("#log")).toContainText("star:Banana | row-toolbar:custom:star@1/1/2")
	await row.hover()
	await page.locator(".row-toolbar").getByRole("button", {name: "Delete row"}).click()
	await expect(page.locator("#log")).toContainText("row-toolbar:delete:-@1/1/2")
})

test("context menu: dynamic text, hidden items and trailing divider dropped, onAction gets the cell", async ({page}) => {
	await page.locator("#toolbar-wrap td", {hasText: "Cherry"}).click({button: "right"})
	const menu = page.locator(".context-menu fluent-menu")
	await expect(menu.locator("fluent-menu-item")).toHaveCount(1)
	await expect(menu.locator("fluent-divider")).toHaveCount(0)
	await menu.locator("fluent-menu-item", {hasText: "Copy Name"}).click()
	await expect(page.locator("#log")).toContainText("copy:Cherry | context-menu:custom:copy@2/2/3")
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

test("editTrigger always: the same cell commits again after its first edit", async ({page}) => {
	const input = page.locator("#always-wrap tbody tr").first().locator("input")
	await input.fill("Alicia")
	await page.locator("#always-wrap tbody tr").nth(1).locator("input").focus()
	await expect(page.locator("#always-log")).toHaveText("Alicia")
	await input.fill("Ali")
	await page.locator("#always-wrap tbody tr").nth(1).locator("input").focus()
	await expect(page.locator("#always-log")).toHaveText("Alicia | Ali")
})

// ---- Row identity: viewIndex (displayed position) vs itemIndex (position in `items`) ----

async function editCell(wrap: Locator, cellText: string, text: string) {
	await wrap.locator("td", {hasText: cellText}).dblclick()
	await expect(wrap.locator("td.editing input")).toBeFocused()
	await wrap.page().keyboard.press("Control+A")
	await wrap.page().keyboard.type(text)
	await wrap.page().keyboard.press("Enter")
}

test("pageable, no idMember: editing a page-2 row reports its itemIndex and writes back to that row", async ({page}) => {
	const wrap = page.locator("#paged-wrap")
	await wrap.getByRole("button", {name: "Next"}).click()
	await editCell(wrap, "Charlie", "Carl")
	await expect(page.locator("#paged-log")).toHaveText("2/0/key")
	await expect(wrap.locator("tbody tr").first()).toHaveText("Carl")
	await wrap.getByRole("button", {name: "Previous"}).click()
	await expect(wrap.locator("tbody tr").first()).toHaveText("Alpha")
})

test("sorted, no idMember: itemIndex points at the edited item, not its sorted position", async ({page}) => {
	const wrap = page.locator("#sorted-wrap")
	await wrap.locator("th.column-header", {hasText: "Name"}).click()
	await expect(wrap.locator("tbody tr").first()).toHaveText("Amy")
	await editCell(wrap, "Zed", "Zoe")
	await expect(page.locator("#sorted-log")).toHaveText("change:0/2")
	await expect(wrap.locator("tbody td")).toHaveText(["Amy", "Kim", "Zoe"])
	await wrap.locator("td", {hasText: "Kim"}).click({button: "right"})
	await page.locator(".context-menu fluent-menu-item", {hasText: "Pick"}).click()
	await expect(page.locator("#sorted-log")).toHaveText("change:0/2 | action:2/1")
})

test("no idMember: an invalid draft on page 1 does not show on page 2", async ({page}) => {
	const wrap = page.locator("#paged-wrap")
	await editCell(wrap, "Alpha", "A")
	await expect(wrap.locator("tbody td.validation-error")).toHaveCount(1)
	await wrap.getByRole("button", {name: "Next"}).click()
	await expect(wrap.locator("tbody tr").first()).toHaveText("Charlie")
	await expect(wrap.locator("tbody td.validation-error")).toHaveCount(0)
	await wrap.getByRole("button", {name: "Previous"}).click()
	await expect(wrap.locator("tbody td.validation-error")).toHaveCount(1)
})

test("row toolbar keeps working when the consumer replaces items immutably", async ({page}) => {
	const wrap = page.locator("#bump-wrap")
	// Scroll first: a scroll closes the toolbar, and hover's own scroll could land after mouseenter.
	await wrap.scrollIntoViewIfNeeded()
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
	await wrap.locator("tbody tr", {hasText: "Banana"}).hover()
	const bump = page.locator(".row-toolbar").getByRole("button", {name: "Bump"})
	await bump.click()
	await expect(wrap.locator("tbody tr", {hasText: "Banana"})).toContainText("1")
	await bump.click()
	await expect(page.locator("#bump-log")).toHaveText("Banana@1 | Banana@1")
	await expect(wrap.locator("tbody tr", {hasText: "Banana"})).toContainText("2")
})

test("a row toolbar wider than the space beside the grid stays on screen", async ({page}) => {
	const wrap = page.locator("#wide-toolbar-wrap")
	await wrap.scrollIntoViewIfNeeded()
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
	await wrap.locator("tbody tr", {hasText: "Banana"}).hover()
	const toolbar = page.locator(".row-toolbar")
	await expect(toolbar).toBeVisible()
	const viewportWidth = page.viewportSize()!.width
	await expect.poll(async () => {
		const box = (await toolbar.boundingBox())!
		return box.x >= 0 && box.x + box.width <= viewportWidth
	}).toBe(true)
	await toolbar.getByRole("button", {name: "Move row up"}).click({trial: true})
})
