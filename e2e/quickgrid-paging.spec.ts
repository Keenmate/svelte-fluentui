import {test, expect, type Locator} from "@playwright/test"

/**
 * QuickGrid Phase 4 (2.0.0): sortMode / bind:sort, comparator, filter on the display value,
 * tree sort / expansion, page clamping, server paging (onDataRequest, beforePageChangeCallback).
 * Fixture: docs/src/routes/test/quickgrid-paging/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid-paging")
})

const firstCells = (wrap: Locator) => wrap.locator("tbody tr td:first-child .cell-text")
const header = (wrap: Locator, title: string) => wrap.locator("th.column-header", {hasText: title})

test.describe("QuickGrid Phase 4 — sort/filter/paging", () => {
	test("4.1 deleting rows on the last page moves back to the new last page", async ({page}) => {
		const wrap = page.locator("#del-wrap")
		await wrap.getByRole("button", {name: "Next"}).click()
		await wrap.getByRole("button", {name: "Next"}).click()
		await expect(firstCells(wrap)).toHaveText(["E"])
		await page.locator("#del-last").click()
		await expect(firstCells(wrap)).toHaveText(["C", "D"])
		await expect(wrap.locator(".pagination-info")).toContainText("Page 2 of 2")
		await expect(page.locator("#del-page")).toHaveText("2")
		await page.locator("#del-last").click()
		await page.locator("#del-last").click()
		await expect(firstCells(wrap)).toHaveText(["A", "B"])
		await expect(page.locator("#del-page")).toHaveText("1")
	})

	test("4.1 collapsing the tree from the last page brings the page back into range", async ({page}) => {
		const wrap = page.locator("#paged-tree2-wrap")
		await wrap.getByRole("button", {name: "Next"}).click()
		await wrap.getByRole("button", {name: "Next"}).click()
		await expect(firstCells(wrap)).toHaveText(["Two-a", "Three"])
		await wrap.locator("td", {hasText: "Two-a"}).click({button: "right"})
		await page.locator(".context-menu fluent-menu-item", {hasText: "Collapse entire tree"}).click()
		await expect(firstCells(wrap)).toHaveText(["Three"])
		await expect(wrap.locator(".pagination-info")).toContainText("Page 2 of 2")
	})

	test("4.6 the tree pager counts the visible rows", async ({page}) => {
		const wrap = page.locator("#paged-tree-wrap")
		await expect(firstCells(wrap)).toHaveText(["One", "Two"])
		await expect(wrap.locator(".pagination-info")).toHaveText(/Page 1 of 2\s*\(3 items\)/)
	})

	test("4.2 sortMode single: a header click cycles asc → desc → none; sortable: false opts out", async ({page}) => {
		const wrap = page.locator("#single-wrap")
		await expect(header(wrap, "Name").locator(".sort-indicator")).toHaveCount(1)
		await expect(header(wrap, "Team").locator(".sort-indicator")).toHaveCount(0)
		await header(wrap, "Name").click()
		await expect(firstCells(wrap)).toHaveText(["Amy", "Bob", "Kim", "Zed"])
		await header(wrap, "Name").click()
		await expect(firstCells(wrap)).toHaveText(["Zed", "Kim", "Bob", "Amy"])
		await header(wrap, "Name").click()
		await expect(firstCells(wrap)).toHaveText(["Kim", "Amy", "Zed", "Bob"])
		await header(wrap, "Team").click()
		await expect(firstCells(wrap)).toHaveText(["Kim", "Amy", "Zed", "Bob"])
		await expect(page.locator("#single-log")).toHaveText("name:asc | name:desc | none")
		await expect(page.locator("#single-sort")).toHaveText("none")
	})

	test("4.2 sortMode none (default): no sort UI, even for a column with sortable: true", async ({page}) => {
		const wrap = page.locator("#none-wrap")
		await expect(wrap.locator(".sort-indicator")).toHaveCount(0)
		await header(wrap, "Name").click()
		await expect(firstCells(wrap)).toHaveText(["Kim", "Amy", "Zed", "Bob"])
	})

	test("4.8 bind:sort sets the initial sort; Ctrl+click adds a column in multiple mode", async ({page}) => {
		const wrap = page.locator("#multi-wrap")
		const names = wrap.locator("tbody tr td:nth-child(2) .cell-text")
		await expect(names).toHaveText(["Kim", "Bob", "Amy", "Zed"])
		await header(wrap, "Name").click({modifiers: ["ControlOrMeta"]})
		await expect(names).toHaveText(["Bob", "Kim", "Amy", "Zed"])
		await expect(page.locator("#multi-sort")).toHaveText("team:desc,name:asc")
		await expect(header(wrap, "Name").locator(".sort-priority")).toHaveText("2")
		await header(wrap, "Name").click()
		await expect(names).toHaveText(["Amy", "Bob", "Kim", "Zed"])
		await expect(page.locator("#multi-sort")).toHaveText("name:asc")
	})

	test("4.3 tree: sorting orders siblings within their parent", async ({page}) => {
		const wrap = page.locator("#tree-sort-wrap")
		await expect(firstCells(wrap)).toHaveText(["B-team", "Zed", "Amy", "A-team", "Kim"])
		await header(wrap, "Name").click()
		await expect(firstCells(wrap)).toHaveText(["A-team", "Kim", "B-team", "Amy", "Zed"])
		await header(wrap, "Name").click()
		await expect(firstCells(wrap)).toHaveText(["B-team", "Zed", "Amy", "A-team", "Kim"])
	})

	test("4.4 comparator: numeric text, empty values last both ways, dates by time, sort value / compare callbacks", async ({page}) => {
		const wrap = page.locator("#cmp-wrap")
		const ids = firstCells(wrap)
		await header(wrap, "Code").click()
		await expect(ids).toHaveText(["5", "3", "1", "2", "4"])
		await header(wrap, "Code").click()
		await expect(ids).toHaveText(["1", "3", "5", "2", "4"])
		await header(wrap, "When").click()
		await expect(ids).toHaveText(["3", "5", "1", "4", "2"])
		await header(wrap, "When").click()
		await expect(ids).toHaveText(["4", "1", "5", "3", "2"])
		await header(wrap, "Prio").click()
		await expect(ids).toHaveText(["2", "5", "3", "1", "4"])
		await header(wrap, "Rev").click()
		await expect(ids).toHaveText(["5", "4", "3", "2", "1"])
	})

	test("4.5 the filter matches the displayed text, ignoring case and diacritics; a column can be exact", async ({page}) => {
		const wrap = page.locator("#filter-wrap")
		const inputs = wrap.locator(".filter-row input")
		await inputs.nth(0).fill("zurich")
		await expect(firstCells(wrap)).toHaveText(["1"])
		await inputs.nth(0).fill("")
		await inputs.nth(1).fill("zurich")
		await expect(wrap.locator("tbody .empty-message")).toBeVisible()
		await inputs.nth(1).fill("Zür")
		await expect(firstCells(wrap)).toHaveText(["1"])
	})

	test("4.7 a parent arriving in items gets the default expansion", async ({page}) => {
		const wrap = page.locator("#chev-wrap")
		await expect(firstCells(wrap)).toHaveText(["Root", "Leaf"])
		await page.locator("#chev-add").click()
		await expect(firstCells(wrap)).toHaveText(["Root", "Leaf", "New root", "New leaf"])
	})

	test("4.7 bind:expandedPaths starting undefined gets the default set and every toggle", async ({page}) => {
		const wrap = page.locator("#grow-wrap")
		const out = page.locator("#grow-expanded")
		await page.locator("#grow-show").click()
		await expect(firstCells(wrap)).toHaveText(["Root", "Leaf"])
		await expect(out).toHaveText("1")
		await page.locator("#grow-add").click()
		await expect(out).toHaveText("1,2")
		await wrap.locator("tr", {hasText: "Root"}).first().locator(".tree-chevron").click()
		await expect(firstCells(wrap)).toHaveText(["Root", "New root", "New leaf"])
		await expect(out).toHaveText("2")
	})

	test("4.7 while filtering, matches show with their ancestors and chevrons are disabled", async ({page}) => {
		const wrap = page.locator("#chev-wrap")
		await wrap.locator(".tree-chevron").click()
		await expect(firstCells(wrap)).toHaveText(["Root"])
		const filter = wrap.locator(".filter-row input")
		await filter.fill("leaf")
		await expect(firstCells(wrap)).toHaveText(["Root", "Leaf"])
		const chevron = wrap.locator(".tree-chevron")
		await expect(chevron).toHaveCount(1)
		await expect(chevron).toBeDisabled()
		await expect(chevron).toHaveClass(/expanded/)
		await filter.fill("root")
		await expect(firstCells(wrap)).toHaveText(["Root"])
		await expect(wrap.locator(".tree-chevron")).toHaveCount(0)
		await filter.fill("")
		await expect(firstCells(wrap)).toHaveText(["Root"])
	})

	test("4.8 server paging: init, pager, page size, sort and filter all go through onDataRequest", async ({page}) => {
		const wrap = page.locator("#server-wrap")
		const log = page.locator("#server-log")
		await expect(firstCells(wrap)).toHaveText(["Row 01", "Row 02", "Row 03", "Row 04", "Row 05"])
		await expect(wrap.locator(".pagination-info")).toHaveText(/Page 1 of 5\s*\(23 items\)/)
		await expect(log).toHaveText("init:p1/s5/k0/none/{}")
		await wrap.getByRole("button", {name: "Next"}).click()
		await expect(firstCells(wrap).first()).toHaveText("Row 06")
		await expect(log).toContainText("before:page:1->2 | page=2 | page:p2/s5/k5/none/{}")
		await wrap.locator(".pagination-size-select").selectOption("10")
		await expect(firstCells(wrap)).toHaveCount(10)
		await expect(page.locator("#server-page")).toHaveText("1/10")
		await expect(log).toContainText("before:page-size:2->1 | page=1 | page-size:p1/s10/k0/none/{}")
		await header(wrap, "Name").click()
		await header(wrap, "Name").click()
		await expect(firstCells(wrap).first()).toHaveText("Row 23")
		await expect(log).toContainText("before:sort:1->1 | sort:p1/s10/k0/name:asc/{} | before:sort:1->1 | sort:p1/s10/k0/name:desc/{}")
		await wrap.locator(".filter-row input").fill("Row 1")
		await expect(firstCells(wrap).first()).toHaveText("Row 19")
		await expect(log).toContainText(`filter:p1/s10/k0/name:desc/{"name":"Row 1"}`)
		await expect(wrap.locator(".pagination-info")).toHaveText(/Page 1 of 1\s*\(10 items\)/)
	})

	test("4.8 beforePageChangeCallback: false (sync or async) keeps the page; the pager waits", async ({page}) => {
		const wrap = page.locator("#server-wrap")
		const next = wrap.getByRole("button", {name: "Next"})
		await expect(firstCells(wrap).first()).toHaveText("Row 01")
		await page.locator("#block-sync").check()
		await next.click()
		await expect(page.locator("#server-log")).toContainText("before:page:1->2")
		await wrap.locator(".pagination-size-select").selectOption("10")
		await expect(wrap.locator(".pagination-size-select")).toHaveValue("5")
		await page.locator("#block-async").check()
		await next.click()
		await expect(next).toBeDisabled()
		await expect(next).toBeEnabled()
		await expect(page.locator("#server-page")).toHaveText("1/5")
		await expect(firstCells(wrap).first()).toHaveText("Row 01")
		await expect(page.locator("#server-log")).not.toContainText("page=")
	})

	test("4.1 server: a smaller totalItems brings currentPage back and requests that page", async ({page}) => {
		const wrap = page.locator("#server-wrap")
		const next = wrap.getByRole("button", {name: "Next"})
		for (const first of ["Row 06", "Row 11", "Row 16", "Row 21"]) {
			await next.click()
			await expect(firstCells(wrap).first()).toHaveText(first)
		}
		await page.locator("#server-shrink").click()
		await expect(firstCells(wrap)).toHaveText(["Row 06", "Row 07", "Row 08"])
		await expect(wrap.locator(".pagination-info")).toHaveText(/Page 2 of 2\s*\(8 items\)/)
		await expect(page.locator("#server-page")).toHaveText("2/5")
		await expect(page.locator("#server-log")).toContainText("page=2 | page:p2/s5/k5/none/{}")
	})
})
