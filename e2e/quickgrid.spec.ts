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

test("no idMember but rows have id: id is the row key, so an invalid cell survives an immutable update", async ({page}) => {
	const wrap = page.locator("#default-id-wrap")
	await editCell(wrap, "Alpha", "A")
	await expect(page.locator("#default-id-log")).toHaveText("7")
	await expect(wrap.locator("tbody td.validation-error")).toHaveCount(1)
	await wrap.getByRole("button", {name: "Replace rows"}).click()
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

// ---- Phase 2: editing state machine ----

async function typeInto(wrap: Locator, cellText: string, text: string) {
	await wrap.locator("td.editable-cell").filter({hasText: new RegExp(`^${cellText}`)}).first().dblclick()
	await expect(wrap.locator("td.editing input")).toBeFocused()
	await wrap.page().keyboard.press("Control+A")
	await wrap.page().keyboard.type(text)
}

test("an async commit resolving does not close the editor opened meanwhile, nor show it as validating", async ({page}) => {
	const wrap = page.locator("#async-wrap")
	await typeInto(wrap, "Alpha", "A")
	// dblclick on City blurs (= commits) Name, whose validation takes 400 ms
	await wrap.locator("td", {hasText: "Oslo"}).dblclick()
	const cityEditor = wrap.locator("tbody tr").first().locator("td").nth(1).locator("input")
	await expect(cityEditor).toBeFocused()
	// Name is still validating: the City editor must not show that as its own state
	expect(await wrap.locator(".validating-indicator").count()).toBe(0)
	await expect(page.locator("#async-log")).toContainText("name:A:false")
	await expect(cityEditor).toBeVisible()
	await expect(cityEditor).toBeFocused()
})

test("a valid commit on another field keeps the row's pending invalid draft", async ({page}) => {
	const wrap = page.locator("#async-wrap")
	await typeInto(wrap, "Alpha", "A")
	await wrap.locator("td", {hasText: "Oslo"}).dblclick()
	await page.keyboard.press("Control+A")
	await page.keyboard.type("Paris")
	await page.keyboard.press("Enter")
	await expect(page.locator("#async-log")).toContainText("name:A:false")
	await expect(wrap.locator("td.validation-error .cell-text")).toHaveText("A")
	await expect(wrap.locator("td", {hasText: "Paris"})).toBeVisible()
})

test("onRowChange: draftRow, invalidFields and isRowValid describe the whole row", async ({page}) => {
	const wrap = page.locator("#async-wrap")
	const log = page.locator("#async-log")
	await typeInto(wrap, "Alpha", "A")
	await page.keyboard.press("Enter")
	await expect(log).toHaveText("name:A:false row:false inv:name=A draft:A/Oslo")
	await typeInto(wrap, "Oslo", "Paris")
	await page.keyboard.press("Enter")
	await expect(log).toContainText("city:Paris:true row:false inv:name=A draft:A/Paris")
	await typeInto(wrap, "A", "Anna")
	await page.keyboard.press("Enter")
	await expect(log).toContainText("name:Anna:true row:true inv: draft:Anna/Paris")
	await expect(wrap.locator("td.validation-error")).toHaveCount(0)
	await expect(wrap.locator("tbody tr").first().locator("td").first()).toHaveText("Anna")
})

test("an invalid cell shows its override; other fields show the consumer's live values", async ({page}) => {
	const wrap = page.locator("#async-wrap")
	await typeInto(wrap, "Alpha", "A")
	await page.keyboard.press("Enter")
	await expect(wrap.locator("td.validation-error .cell-text")).toHaveText("A")
	await page.locator("#async-city").click()
	await expect(wrap.locator("tbody tr").first().locator("td").nth(1)).toHaveText("Rome")
	// renderCellCallback and the context menu see the draft value too
	await expect(wrap.locator(".label-html").first()).toHaveText("A")
	await wrap.locator("td.validation-error").click({button: "right"})
	await page.locator(".context-menu fluent-menu-item", {hasText: "Copy"}).click()
	await expect(page.locator("#async-log")).toContainText("copy:A")
})

test("resetting invalidCells drops the drafts; discardDrafts() is exported", async ({page}) => {
	const wrap = page.locator("#async-wrap")
	const firstCell = wrap.locator("tbody tr").first().locator("td").first()
	await typeInto(wrap, "Alpha", "A")
	await page.keyboard.press("Enter")
	await expect(firstCell).toHaveClass(/validation-error/)
	await page.locator("#async-clear").click()
	await expect(firstCell).toHaveText("Alpha")
	await expect(firstCell).not.toHaveClass(/validation-error/)
	await typeInto(wrap, "Alpha", "B")
	await page.keyboard.press("Enter")
	await expect(firstCell).toHaveClass(/validation-error/)
	await page.locator("#async-discard").click()
	await expect(firstCell).toHaveText("Alpha")
	await expect(firstCell).not.toHaveClass(/validation-error/)
})

test("reopening an invalid cell shows the inline validation message", async ({page}) => {
	const wrap = page.locator("#async-wrap")
	await typeInto(wrap, "Alpha", "A")
	await page.keyboard.press("Enter")
	await expect(wrap.locator("td.validation-error")).toHaveCount(1)
	await wrap.locator("td.validation-error").dblclick()
	await expect(wrap.locator("td.editing input")).toHaveValue("A")
	await expect(wrap.locator("td.editing .validation-error-message")).toHaveText("Too short")
})

test("custom editor committing synchronously leaves edit mode", async ({page}) => {
	const wrap = page.locator("#custom-wrap")
	await page.locator("#custom-sync").click()
	await wrap.locator("td", {hasText: "Alpha"}).dblclick()
	await expect(page.locator("#custom-log")).toContainText("change:Alpha!:true")
	await expect(wrap.locator(".custom-editing-indicator")).toHaveCount(0)
	await expect(wrap.locator("tbody tr").first()).toHaveText("Alpha!")
})

test("custom editor: events fire, commit validates, is one-shot, and value is the draft", async ({page}) => {
	const wrap = page.locator("#custom-wrap")
	const log = page.locator("#custom-log")
	await wrap.locator("td", {hasText: "Alpha"}).dblclick()
	await expect(log).toHaveText("start:name | open:Alpha")
	await page.locator("#custom-invalid").click()
	await expect(log).toContainText("change:A:false")
	await expect(wrap.locator("td.validation-error .cell-text")).toHaveText("A")
	await wrap.locator("td.validation-error").dblclick()
	await expect(log).toContainText("open:A")
	await page.locator("#custom-twice").click()
	await expect(log).toHaveText("start:name | open:Alpha | change:A:false | start:name | open:A | change:Bob:true")
	await expect(wrap.locator("tbody tr").first()).toHaveText("Bob")
	await page.locator("#custom-cancel").click()
	await wrap.locator("td", {hasText: "Bravo"}).dblclick()
	await page.locator("#custom-cancel").click()
	await expect(log).toContainText("open:Bravo | cancel:name")
	await expect(wrap.locator(".custom-editing-indicator")).toHaveCount(0)
})

test("a row whose key changes mid-edit cancels the edit", async ({page}) => {
	const wrap = page.locator("#custom-wrap")
	const log = page.locator("#custom-log")
	await wrap.locator("td", {hasText: "Alpha"}).dblclick()
	await expect(log).toHaveText("start:name | open:Alpha")
	await page.locator("#custom-reid").click()
	await expect(log).toHaveText("start:name | open:Alpha | cancel:name")
	await page.locator("#custom-invalid").click()  // the stale ctx must not commit
	await page.waitForTimeout(100)
	await expect(log).toHaveText("start:name | open:Alpha | cancel:name")
})

test("a late options load does not open the editor on the previous cell", async ({page}) => {
	const wrap = page.locator("#options-wrap")
	await wrap.locator("td", {hasText: "web"}).dblclick()
	await wrap.locator("td", {hasText: "api"}).dblclick()
	await expect(wrap.locator("td.editing")).toHaveCount(1)
	await page.waitForTimeout(900)
	await expect(wrap.locator("td.editing")).toHaveCount(1)
	await expect(wrap.locator("tbody tr").nth(1).locator("td.editing")).toHaveCount(1)
	await expect(page.locator("#options-log")).toHaveText("start:2")
})

test("Space on a checkbox validates and toggles the draft value", async ({page}) => {
	const wrap = page.locator("#check-wrap")
	const cell = wrap.locator("tbody td").nth(1)
	await cell.click()
	await page.keyboard.press(" ")
	await expect(page.locator("#check-log")).toHaveText("done:true:false")
	await expect(cell).toHaveClass(/validation-error/)
	await expect(cell.locator("input")).toBeChecked()
	await page.keyboard.press(" ")
	await expect(page.locator("#check-log")).toHaveText("done:true:false | done:false:true")
	await expect(cell).not.toHaveClass(/validation-error/)
	await expect(cell.locator("input")).not.toBeChecked()
})

test("editTrigger always: an editor shows the consumer's new value when not focused", async ({page}) => {
	const inputs = page.locator("#always-wrap tbody input")
	await expect(inputs.nth(1)).toHaveValue("Bob")
	await page.locator("#always-rename").click()
	await expect(inputs.nth(1)).toHaveValue("Robert")
	await inputs.nth(1).focus()
	await inputs.nth(0).focus()
	await page.waitForTimeout(100)
	await expect(page.locator("#always-log")).toHaveText("")
})
