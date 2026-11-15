import {test, expect, type Locator, type Page} from "@playwright/test"

/**
 * QuickGrid render / filter caches (perf step): rows keep their rendered cells across filter /
 * sort runs, and filter texts are folded once per distinct text — yet every change a cell or a
 * filter depends on still shows. Fixture: docs/src/routes/test/quickgrid-cache/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid-cache")
})

const rows = (wrap: Locator) => wrap.locator("tbody tr[data-row-key]")
const column = (wrap: Locator, col: number) => wrap.locator(`tbody tr[data-row-key] td[data-col="${col}"] .cell-text`)
const filter = (wrap: Locator, col: number) => wrap.locator(".filter-input").nth(col)
const deep = (page: Page) => page.locator("#deep-wrap")

test("a filter keystroke does not re-format the rows it keeps", async ({page}) => {
	const wrap = deep(page)
	await expect(rows(wrap)).toHaveCount(3)
	await page.locator("#calls").click()
	const before = Number(await page.locator("#call-count").textContent())
	// Name has no display callback: filtering it calls none, and the two rows kept aren't re-rendered
	await filter(wrap, 0).fill("o")
	await expect(column(wrap, 0)).toHaveText(["Bořek", "Chloé"])
	await page.locator("#calls").click()
	await expect(page.locator("#call-count")).toHaveText(String(before))
})

test("in-place edits of deep-reactive rows show and re-filter", async ({page}) => {
	const wrap = deep(page)
	await filter(wrap, 1).fill("zur")
	await expect(column(wrap, 0)).toHaveText(["Anna"])
	await page.locator("#deep-mutate").click()  // Anna: ZRH → PRG
	await expect(rows(wrap)).toHaveCount(0)
	await filter(wrap, 1).fill("")
	await expect(column(wrap, 1)).toHaveText(["Praha", "Praha", "Oslo"])

	await filter(wrap, 0).fill("zuz")
	await expect(rows(wrap)).toHaveCount(0)
	await page.locator("#deep-mutate-name").click()  // Bořek → Zuzana
	await expect(column(wrap, 0)).toHaveText(["Zuzana"])
})

test("editing a cell through the grid updates its display (also while filtered and sorted)", async ({page}) => {
	const wrap = deep(page)
	await wrap.locator(".column-sort-button").first().click()  // name asc
	await filter(wrap, 1).fill("r")  // Zürich, Praha (not Oslo)
	await expect(column(wrap, 0)).toHaveText(["Anna", "Bořek"])
	await wrap.locator("td", {hasText: "Bořek"}).dblclick()
	await expect(wrap.locator("td.editing input")).toBeFocused()
	await page.keyboard.press("Control+A")
	await page.keyboard.type("Aaron")
	await page.keyboard.press("Enter")
	await expect(column(wrap, 0)).toHaveText(["Aaron", "Anna"])
	await expect(column(wrap, 1)).toHaveText(["Praha", "Zürich"])
})

test("replacing items immutably and pushing rows update the grid", async ({page}) => {
	const wrap = deep(page)
	await filter(wrap, 1).fill("zur")
	await page.locator("#deep-push").click()
	await expect(column(wrap, 0)).toHaveText(["Anna", "Dana"])
	await page.locator("#deep-replace").click()
	await expect(column(wrap, 0)).toHaveText(["Anna!", "Dana!"])
})

test("state read by a display callback updates cells and filter results", async ({page}) => {
	const wrap = deep(page)
	await filter(wrap, 1).fill("zurich")
	await expect(column(wrap, 0)).toHaveText(["Anna"])
	await page.locator("#lookup").click()  // OSL → Zürichberg
	await expect(column(wrap, 0)).toHaveText(["Anna", "Chloé"])
	await expect(column(wrap, 1)).toHaveText(["Zürich", "Zürichberg"])
})

test("searchBehavior and a new display callback re-run the filter", async ({page}) => {
	const wrap = deep(page)
	await filter(wrap, 1).fill("zur")
	await expect(column(wrap, 0)).toHaveText(["Anna"])
	await page.locator("#exact").click()
	await expect(rows(wrap)).toHaveCount(0)
	await filter(wrap, 1).fill("Zür")
	await expect(column(wrap, 0)).toHaveText(["Anna"])
	await page.locator("#upper").click()  // display → ZÜRICH: no longer contains "Zür" exactly
	await expect(rows(wrap)).toHaveCount(0)
	await filter(wrap, 1).fill("ZÜR")
	await expect(column(wrap, 1)).toHaveText(["ZÜRICH"])
})

test("culture re-formats cells and re-runs the filter on the new text", async ({page}) => {
	const wrap = deep(page)
	await expect(column(wrap, 2).first()).toHaveText("1,234.5")
	await filter(wrap, 2).fill("1,234")
	await expect(column(wrap, 0)).toHaveText(["Anna"])
	await page.locator("#culture-de").click()
	await expect(rows(wrap)).toHaveCount(0)
	await filter(wrap, 2).fill("")
	await expect(column(wrap, 2).first()).toHaveText("1.234,5")
	await filter(wrap, 2).fill("1.234")
	await expect(column(wrap, 0)).toHaveText(["Anna"])
})

test("raw rows mutated in place show once handed over as a new array", async ({page}) => {
	const wrap = page.locator("#raw-wrap")
	await expect(column(wrap, 1).first()).toHaveText("Zürich")
	await page.locator("#raw-mutate").click()
	await expect(column(wrap, 1).first()).toHaveText("Oslo")
})
