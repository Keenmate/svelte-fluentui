import {test, expect, type Locator, type Page} from "@playwright/test"

/**
 * QuickGrid Phase 6 (2.0.0): sort-header buttons + aria-sort, Tab out of navigate mode + roving
 * tabindex, keyboard context menu / row toolbar, treegrid semantics, aria-rowcount / labels /
 * live region, `labels`, Escape layers of always-editors and the hover toolbar.
 * Fixture: docs/src/routes/test/quickgrid-a11y/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid-a11y")
})

const firstCells = (wrap: Locator) => wrap.locator("tbody tr td:first-child .cell-text")
const header = (wrap: Locator, title: string) => wrap.locator("th.column-header", {hasText: title})
const navCell = (page: Page, row: number, col: number) => page.locator(`#nav-wrap tbody tr`).nth(row).locator(`td[data-col="${col}"]`)
const focusedInNavGrid = (page: Page) => page.evaluate(() => !!document.activeElement?.closest("#nav-wrap td"))

test.describe("QuickGrid Phase 6 — keyboard & a11y", () => {
	test("6.1 sort headers are buttons: Enter / Space sort and aria-sort follows", async ({page}) => {
		const wrap = page.locator("#sort-wrap")
		const name = wrap.getByRole("button", {name: "Name"})
		await name.focus()
		await page.keyboard.press("Enter")
		await expect(header(wrap, "Name")).toHaveAttribute("aria-sort", "ascending")
		await expect(firstCells(wrap).first()).toHaveText("Apple")
		await page.keyboard.press(" ")
		await expect(header(wrap, "Name")).toHaveAttribute("aria-sort", "descending")
		await expect(firstCells(wrap).first()).toHaveText("Juniper")
		await expect(header(wrap, "City")).not.toHaveAttribute("aria-sort")
	})

	test("6.1 Ctrl+Enter adds a column in multiple mode; only the primary column has aria-sort", async ({page}) => {
		const wrap = page.locator("#sort-wrap")
		await wrap.getByRole("button", {name: "City"}).focus()
		await page.keyboard.press("Enter")
		await wrap.getByRole("button", {name: "Name"}).focus()
		await page.keyboard.press("Control+Enter")
		await expect(header(wrap, "City")).toHaveAttribute("aria-sort", "ascending")
		await expect(header(wrap, "Name")).not.toHaveAttribute("aria-sort")
		await expect(header(wrap, "Name").locator(".sort-priority")).toHaveText("2")
		await expect(header(wrap, "Name").locator(".sort-indicator")).toHaveAttribute("aria-hidden", "true")
	})

	test("6.2 navigate mode has one tab stop and Tab past the last cell leaves the grid", async ({page}) => {
		await expect(page.locator('#nav-wrap td[tabindex="0"]')).toHaveCount(1)
		await navCell(page, 2, 0).click()
		await page.keyboard.press("Tab")
		await expect(navCell(page, 2, 1)).toBeFocused()
		await expect(page.locator('#nav-wrap td[tabindex="0"]')).toHaveCount(1)
		await expect(navCell(page, 2, 1)).toHaveAttribute("tabindex", "0")
		await page.keyboard.press("Tab")
		expect(await focusedInNavGrid(page)).toBe(false)
		await expect(page.locator("#after")).toBeFocused()
		// Shift+Tab comes back to the roving cell
		await page.keyboard.press("Shift+Tab")
		await expect(navCell(page, 2, 1)).toBeFocused()
	})

	test("6.2 Shift+Tab before the first cell leaves the grid", async ({page}) => {
		await navCell(page, 0, 0).click()
		await page.keyboard.press("Shift+Tab")
		expect(await focusedInNavGrid(page)).toBe(false)
	})

	test("6.3 Shift+F10 opens the context menu at the cell; arrows move, Enter runs, focus returns", async ({page}) => {
		const cell = navCell(page, 1, 1)
		await cell.click()
		await page.keyboard.press("Shift+F10")
		const menu = page.locator(".context-menu")
		await expect(menu).toBeVisible()
		await expect(menu.getByRole("menuitem", {name: "Copy"})).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(menu.getByRole("menuitem", {name: "Paste"})).toBeFocused()
		await page.keyboard.press("Enter")
		await expect(menu).toHaveCount(0)
		await expect(page.locator("#action-log")).toHaveText("paste:2")
		await expect(cell).toBeFocused()
	})

	test("6.3 the ContextMenu key opens the menu; Escape closes it and restores focus", async ({page}) => {
		const cell = navCell(page, 0, 0)
		await cell.click()
		await page.keyboard.press("ContextMenu")
		const menu = page.locator(".context-menu")
		await expect(menu.getByRole("menuitem", {name: "Copy"})).toBeFocused()
		const box = (await menu.boundingBox())!
		const cellBox = (await cell.boundingBox())!
		expect(Math.abs(box.y - (cellBox.y + cellBox.height))).toBeLessThan(2)
		await page.keyboard.press("Escape")
		await expect(menu).toHaveCount(0)
		await expect(cell).toBeFocused()
	})

	test("6.4 tree grid: treegrid role, aria-level, aria-expanded and a labelled chevron", async ({page}) => {
		const wrap = page.locator("#tree-wrap")
		await expect(wrap.locator("table")).toHaveAttribute("role", "treegrid")
		const fruit = wrap.locator("tbody tr", {hasText: "Fruit"})
		await expect(fruit).toHaveAttribute("aria-level", "1")
		await expect(fruit).toHaveAttribute("aria-expanded", "false")
		const chevron = fruit.getByRole("button", {name: "Expand"})
		await chevron.focus()
		expect(await chevron.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none")
		await page.keyboard.press("Enter")
		await expect(fruit).toHaveAttribute("aria-expanded", "true")
		await expect(fruit.getByRole("button", {name: "Collapse"})).toBeVisible()
		const apple = wrap.locator("tbody tr", {hasText: "Apple"})
		await expect(apple).toHaveAttribute("aria-level", "2")
		await expect(apple).not.toHaveAttribute("aria-expanded")
	})

	test("6.5 Alt+F10 opens the hover toolbar from the keyboard; arrows move, Enter runs, Escape returns", async ({page}) => {
		const cell = navCell(page, 1, 0)
		await cell.focus()
		await page.keyboard.press("Alt+F10")
		const toolbar = page.getByRole("toolbar")
		await expect(toolbar).toBeVisible()
		await expect(toolbar.getByRole("button", {name: "Star"})).toBeFocused()
		await page.keyboard.press("ArrowRight")
		await expect(toolbar.getByRole("button", {name: "Flag"})).toBeFocused()
		await page.keyboard.press("Enter")
		await expect(page.locator("#action-log")).toHaveText("flag:2")
		await page.keyboard.press("Escape")
		await expect(page.locator(".row-toolbar")).toHaveCount(0)
		await expect(cell).toBeFocused()
	})

	test("6.5 rows of a hover-toolbar grid are one tab stop; arrows move, Enter opens the toolbar", async ({page}) => {
		const rows = page.locator("#row-wrap tbody tr")
		await expect(page.locator('#row-wrap tbody tr[tabindex="0"]')).toHaveCount(1)
		await expect(rows.first()).toHaveAttribute("tabindex", "0")
		await rows.first().focus()
		await page.keyboard.press("ArrowDown")
		await expect(rows.nth(1)).toBeFocused()
		await expect(rows.nth(1)).toHaveAttribute("tabindex", "0")
		await expect(rows.first()).toHaveAttribute("tabindex", "-1")
		await page.keyboard.press("Enter")
		await expect(page.getByRole("toolbar").getByRole("button", {name: "Star"})).toBeFocused()
		await page.keyboard.press("Enter")
		await expect(page.locator("#action-log")).toHaveText("star:2")
		await page.keyboard.press("Tab")
		await expect(page.locator(".row-toolbar")).toHaveCount(0)
		await expect(rows.nth(1)).toBeFocused()
	})

	test("6.5 the ⋮ trigger is labelled, reports its popup and moves focus into the toolbar", async ({page}) => {
		const trigger = page.locator("#button-wrap").getByRole("button", {name: "Row actions"}).first()
		await expect(trigger).toHaveAttribute("aria-haspopup", "true")
		await expect(trigger).toHaveAttribute("aria-expanded", "false")
		await trigger.focus()
		await page.keyboard.press("Enter")
		await expect(trigger).toHaveAttribute("aria-expanded", "true")
		await expect(page.getByRole("toolbar").getByRole("button", {name: "Star"})).toBeFocused()
	})

	test("6.6 a paged grid sets aria-rowcount / aria-rowindex; table and filter inputs are labelled", async ({page}) => {
		const wrap = page.locator("#sort-wrap")
		const table = page.getByRole("table", {name: "Fruit list"})
		await expect(table).toHaveAttribute("aria-rowcount", "12")  // 2 header rows + 10
		await expect(wrap.locator("tbody tr").first()).toHaveAttribute("aria-rowindex", "3")
		await wrap.getByRole("button", {name: "Next"}).click()
		await expect(wrap.locator("tbody tr").first()).toHaveAttribute("aria-rowindex", "6")
		await expect(wrap.getByRole("textbox", {name: "Filter Name"})).toBeVisible()
		await expect(page.getByRole("table", {name: "Localised grid"})).toBeVisible()
	})

	test("6.6 server paging counts totalItems in aria-rowcount", async ({page}) => {
		const wrap = page.locator("#server-wrap")
		await expect(wrap.locator("table")).toHaveAttribute("aria-rowcount", "24")
		await wrap.getByRole("button", {name: "Next"}).click()
		await expect(wrap.locator("tbody tr").first()).toHaveAttribute("aria-rowindex", "7")
	})

	test("6.6 a polite live region announces filter results, page and sort changes", async ({page}) => {
		const wrap = page.locator("#sort-wrap")
		const status = wrap.getByRole("status")
		await expect(status).toHaveAttribute("aria-live", "polite")
		await wrap.getByRole("textbox", {name: "Filter Name"}).fill("e")
		await expect(status).toHaveText("6 items")
		await wrap.getByRole("button", {name: "Next"}).click()
		await expect(status).toHaveText("Page 2 of 2")
		await wrap.getByRole("button", {name: "City"}).click()
		await expect(status).toHaveText("Sorted by City, ascending")
	})

	test("6.7 labels localise the filter placeholder, pager and empty message", async ({page}) => {
		const wrap = page.locator("#labels-wrap")
		await expect(wrap.locator(".filter-input").first()).toHaveAttribute("placeholder", "Filtrovat…")
		await expect(wrap.getByRole("button", {name: "Další"})).toBeVisible()
		await expect(wrap.getByRole("button", {name: "Předchozí"})).toBeVisible()
		await expect(wrap.locator(".pagination-info").first()).toContainText("Strana 1 z 2")
		await expect(wrap.locator(".empty-message")).toHaveText("Žádné položky")
	})

	test("D1 an always-editor doesn't swallow Escape pressed elsewhere", async ({page}) => {
		await page.locator("#esc-probe").focus()
		await page.keyboard.press("Escape")
		await expect(page.locator("#esc-log")).toHaveText("esc")
	})

	test("D1 after Escape an always-editor reverts and still commits on the next blur", async ({page}) => {
		const input = page.locator("#always-wrap tbody tr").first().locator("input")
		await input.fill("Kiwi")
		await page.keyboard.press("Escape")
		await expect(input).toHaveValue("Apple")
		await page.locator("#esc-probe").focus()
		await expect(page.locator("#always-names")).toHaveText("Apple,Banana")
		await input.fill("Lime")
		await page.locator("#esc-probe").focus()
		await expect(page.locator("#always-names")).toHaveText("Lime,Banana")
	})

	test("D2 Escape over a hovered row inside a dialog closes the dialog", async ({page}) => {
		await page.locator("#open-dialog").click()
		await page.locator("#dialog-wrap tbody tr", {hasText: "Banana"}).hover()
		await expect(page.locator(".row-toolbar")).toBeVisible()
		await page.keyboard.press("Escape")
		await expect(page.locator("#dialog-open")).toHaveText("false")
	})
})
