import {test, expect, type Locator, type Page} from "@playwright/test"

/**
 * QuickGrid `virtualize` (perf step): only the rows in view (+ overscan) are rendered in a
 * scrolling container; keyboard navigation scrolls; aria-rowcount / aria-rowindex count every
 * displayed row; sorting, filtering, tree and editing keep working; ignored with paging.
 * Fixture: docs/src/routes/test/quickgrid-virtual/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid-virtual")
})

const dataRows = (wrap: Locator) => wrap.locator("tbody tr[data-row-key]")
const row = (wrap: Locator, key: string | number) => wrap.locator(`tbody tr[data-row-key="${key}"]`)
const container = (wrap: Locator) => wrap.locator(".quickgrid-container")
const scrollTo = (wrap: Locator, top: number | "end") => container(wrap).evaluate((el, top) => {
	el.scrollTop = top === "end" ? el.scrollHeight : top
}, top)

/** The row is inside the container's viewport, below the sticky header. */
async function expectInView(wrap: Locator, key: string | number) {
	await expect.poll(() => row(wrap, key).evaluate((tr) => {
		const box = tr.closest(".quickgrid-container")!
		const view = box.getBoundingClientRect()
		const head = box.querySelector("thead")!.getBoundingClientRect()
		const r = tr.getBoundingClientRect()
		return r.top >= head.bottom - 1 && r.bottom <= view.bottom + 1
	})).toBe(true)
}

const nav = (page: Page) => page.locator("#nav-wrap")

test("renders a window of rows; aria-rowcount / aria-rowindex count all of them", async ({page}) => {
	const wrap = nav(page)
	await expect(row(wrap, 1)).toBeVisible()
	const count = await dataRows(wrap).count()
	expect(count).toBeGreaterThan(10)
	expect(count).toBeLessThan(40)
	// filter row + header row + 1000
	await expect(wrap.locator("table")).toHaveAttribute("aria-rowcount", "1002")
	await expect(row(wrap, 1)).toHaveAttribute("aria-rowindex", "3")
	await expect(wrap.locator("thead tr.filter-row")).toHaveAttribute("aria-rowindex", "1")
	// The container scrolls the full height
	const scrollHeight = await container(wrap).evaluate((el) => el.scrollHeight)
	expect(scrollHeight).toBeGreaterThan(1000 * 30)
})

test("scrolling renders the rows in view", async ({page}) => {
	const wrap = nav(page)
	await scrollTo(wrap, 500 * 37)
	await expect(row(wrap, 500)).toBeAttached()
	await expect(row(wrap, 1)).not.toBeAttached()
	await expect(row(wrap, 500)).toHaveAttribute("aria-rowindex", "502")
	expect(await dataRows(wrap).count()).toBeLessThan(40)
	await scrollTo(wrap, "end")
	await expectInView(wrap, 1000)
	await expect(row(wrap, 1000).locator("td").nth(2)).toHaveText("WEB")
})

test("stripes stay on the same rows while scrolling", async ({page}) => {
	const wrap = nav(page)
	const stripe = (key: number) => row(wrap, key).evaluate((tr) => getComputedStyle(tr).backgroundColor)
	const even = await stripe(2)
	const odd = await stripe(3)
	expect(even).not.toBe(odd)
	let previous = "1"
	for (const top of [101 * 37, 333 * 37]) {
		await scrollTo(wrap, top)
		// The window re-renders on the scroll event — read its first row after that
		await expect(dataRows(wrap).first()).not.toHaveAttribute("data-row-key", previous)
		previous = (await dataRows(wrap).first().getAttribute("data-row-key"))!
		const first = Number(previous)
		await expect.poll(() => stripe(first + 1)).toBe(first % 2 === 1 ? even : odd)
	}
})

test("keyboard navigation scrolls the focused cell into view, both ways", async ({page}) => {
	const wrap = nav(page)
	await row(wrap, 1).locator('td[data-col="1"]').click()
	// One key at a time: the grid moves focus on the next frame (a key pressed before that
	// repeats the move from the same cell — not virtualisation-specific)
	for (let key = 2; key <= 41; key++) {
		await page.keyboard.press("ArrowDown")
		await expect(row(wrap, key).locator('td[data-col="1"]')).toBeFocused()
	}
	await expectInView(wrap, 41)
	expect(await container(wrap).evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
	await expect(row(wrap, 1)).not.toBeAttached()
	for (let key = 40; key >= 1; key--) {
		await page.keyboard.press("ArrowUp")
		await expect(row(wrap, key).locator('td[data-col="1"]')).toBeFocused()
	}
	await expectInView(wrap, 1)
})

test("Tab into the grid after scrolling away lands on a rendered row", async ({page}) => {
	const wrap = nav(page)
	await row(wrap, 1).locator('td[data-col="0"]').click()
	await scrollTo(wrap, 600 * 37)
	await wrap.locator(".column-sort-button").last().focus()
	// Focus left the grid: its row is no longer kept rendered
	await expect(row(wrap, 1)).not.toBeAttached()
	await expect(wrap.locator('tbody td[tabindex="0"]')).toHaveCount(1)
	await page.keyboard.press("Tab")
	const focusedKey = await page.evaluate(() => document.activeElement?.closest("tr")?.getAttribute("data-row-key"))
	expect(Number(focusedKey)).toBeGreaterThan(550)
})

test("a focused cell scrolled out of the window keeps focus; arrows continue from it", async ({page}) => {
	const wrap = nav(page)
	const focusedCell = row(wrap, 2).locator('td[data-col="1"]')
	await focusedCell.click()
	await expect(focusedCell).toBeFocused()
	const scrollHeight = await container(wrap).evaluate((el) => el.scrollHeight)
	await scrollTo(wrap, 600 * 37)
	await expect(row(wrap, 600)).toBeAttached()
	// The focused row stays rendered (outside the window), the rest of the window is unchanged
	await expect(focusedCell).toBeFocused()
	expect(await dataRows(wrap).count()).toBeLessThan(45)
	expect(Math.abs(await container(wrap).evaluate((el) => el.scrollHeight) - scrollHeight)).toBeLessThan(2)
	// Stripes still follow the rows' positions
	const stripe = (key: number) => row(wrap, key).evaluate((tr) => getComputedStyle(tr).backgroundColor)
	expect(await stripe(600)).not.toBe(await stripe(601))
	expect(await stripe(600)).toBe(await stripe(2))
	// The next arrow moves on from the focused cell and scrolls it back into view
	await page.keyboard.press("ArrowDown")
	await expect(row(wrap, 3).locator('td[data-col="1"]')).toBeFocused()
	await expectInView(wrap, 3)
	// The other way: the focused row below the window
	await scrollTo(wrap, 600 * 37)
	await row(wrap, 605).locator('td[data-col="0"]').click()
	await scrollTo(wrap, 0)
	await expect(row(wrap, 1)).toBeAttached()
	await expect(row(wrap, 605).locator('td[data-col="0"]')).toBeFocused()
	await page.keyboard.press("ArrowUp")
	await expect(row(wrap, 604).locator('td[data-col="0"]')).toBeFocused()
	await expectInView(wrap, 604)
})

test("rows mode: a focused row scrolled away keeps focus; PageDown / PageUp move by the rows in view", async ({page}) => {
	const wrap = page.locator("#rows-wrap")
	await row(wrap, 1).focus()
	await scrollTo(wrap, "end")
	await expect(row(wrap, 60)).toBeAttached()
	await expect(row(wrap, 1)).toBeFocused()
	await scrollTo(wrap, 0)
	const step = await container(wrap).evaluate((el) => Math.floor((el.clientHeight - el.querySelector("thead")!.offsetHeight) / (el.querySelector("tbody tr[data-row-key]") as HTMLElement).getBoundingClientRect().height))
	await page.keyboard.press("PageDown")
	await expect(row(wrap, 1 + step)).toBeFocused()
	await page.keyboard.press("PageUp")
	await expect(row(wrap, 1)).toBeFocused()
})

test("sorting and filtering work on all rows", async ({page}) => {
	const wrap = nav(page)
	const idHeader = wrap.locator(".column-sort-button").first()
	await idHeader.click()
	await idHeader.click()  // desc
	await expect(dataRows(wrap).first()).toHaveAttribute("data-row-key", "1000")
	await scrollTo(wrap, "end")
	await expectInView(wrap, 1)
	await expect(row(wrap, 1)).toHaveAttribute("aria-rowindex", "1002")

	await wrap.locator(".filter-input").nth(2).fill("ops")  // every third row
	await expect(wrap.locator("table")).toHaveAttribute("aria-rowcount", String(333 + 2))
	await scrollTo(wrap, "end")
	await expectInView(wrap, 3)
	await expect(row(wrap, 3)).toHaveAttribute("aria-rowindex", "335")
})

test("the row being edited stays rendered while scrolled away", async ({page}) => {
	const wrap = nav(page)
	await row(wrap, 2).locator('td[data-col="1"]').click()
	await page.keyboard.press("Enter")
	const input = row(wrap, 2).locator("td.editing input")
	await expect(input).toBeFocused()
	await page.keyboard.press("Control+A")
	await page.keyboard.type("Renamed")
	await scrollTo(wrap, 700 * 37)
	await expect(row(wrap, 700)).toBeAttached()
	await expect(input).toBeAttached()
	await expect(input).toHaveValue("Renamed")
	await scrollTo(wrap, 0)
	await input.focus()
	await page.keyboard.press("Enter")
	await expect(row(wrap, 2).locator('td[data-col="1"] .cell-text')).toHaveText("Renamed")
})

test("tree: collapsing changes the displayed rows and aria-rowcount", async ({page}) => {
	const wrap = page.locator("#tree-wrap")
	await expect(wrap.locator("table")).toHaveAttribute("aria-rowcount", "501")
	await expect(row(wrap, "1.1")).toHaveAttribute("aria-level", "2")
	await row(wrap, "1").locator(".tree-chevron").click()
	await expect(wrap.locator("table")).toHaveAttribute("aria-rowcount", "497")
	await expect(row(wrap, "1.1")).not.toBeAttached()
	await scrollTo(wrap, "end")
	await expectInView(wrap, "100.4")
	await expect(row(wrap, "100.4")).toHaveAttribute("aria-rowindex", "497")
})

test("rows mode: End / Home move focus to rows that weren't rendered", async ({page}) => {
	const wrap = page.locator("#rows-wrap")
	await row(wrap, 1).focus()
	await page.keyboard.press("End")
	await expect(row(wrap, 60)).toBeFocused()
	await expectInView(wrap, 60)
	await expect(row(wrap, 1)).not.toBeAttached()
	await page.keyboard.press("Home")
	await expect(row(wrap, 1)).toBeFocused()
	await expectInView(wrap, 1)
})

test("virtualize is ignored with paging", async ({page}) => {
	const wrap = page.locator("#paged-wrap")
	await expect(container(wrap)).not.toHaveClass(/virtualized/)
	await expect(dataRows(wrap)).toHaveCount(10)
	await expect(wrap.locator("tbody.virtual-spacer")).toHaveCount(0)
})

test("the hover toolbar anchors to the hovered row, also after a scroll re-renders the rows", async ({page}) => {
	const wrap = page.locator("#rows-wrap")
	const toolbar = page.getByRole("toolbar")
	// The toolbar sits on the row's top edge; a wrong anchor would be rows away
	const expectNextTo = async (tr: Locator) => {
		const rowBox = (await tr.boundingBox())!
		const barBox = (await toolbar.boundingBox())!
		expect(Math.abs(barBox.y + barBox.height / 2 - (rowBox.y + rowBox.height / 2))).toBeLessThan(rowBox.height * 1.5)
	}
	await scrollTo(wrap, 30 * 37)
	await expect(row(wrap, 35)).toBeAttached()
	await row(wrap, 35).hover()
	await expect(toolbar).toBeVisible()
	await expectNextTo(row(wrap, 35))
	// Scrolling under a still pointer: the toolbar follows the row now under it
	await scrollTo(wrap, 0)
	await expect(row(wrap, 35)).not.toBeAttached()
	const hovered = wrap.locator("tbody tr[data-row-key]:hover")
	await expect(hovered).toHaveCount(1)
	await expect(toolbar).toBeVisible()
	await expectNextTo(hovered)
})
