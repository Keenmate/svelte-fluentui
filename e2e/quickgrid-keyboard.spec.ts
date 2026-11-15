import {test, expect, type Locator, type Page} from "@playwright/test"

/**
 * QuickGrid navigate-mode keyboard (APG grid): arrow keys pressed faster than a frame each
 * advance one cell (the grid tracks the target cell synchronously, focusing it on the next
 * frame); PageUp / PageDown move by the rows that fit in the view (within the page when
 * paged); Home / End to the row's first / last cell; Ctrl+Home / Ctrl+End to the grid's
 * first / last cell. Also with `virtualize` (the target row is scrolled into view).
 * Fixture: docs/src/routes/test/quickgrid-keyboard/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid-keyboard")
})

const wrapOf = (page: Page, id: string) => page.locator(`#${id}-wrap`)
const cell = (wrap: Locator, key: number, col: number) => wrap.locator(`tbody tr[data-row-key="${key}"] td[data-col="${col}"]`)
const focused = (page: Page) => page.evaluate(() => {
	const td = document.activeElement?.closest("td")
	return td ? `${td.closest("tr")?.getAttribute("data-row-key")}:${td.getAttribute("data-col")}` : null
})

/** Synchronous keydowns on the focused element — no frame can pass between them. */
const burst = (page: Page, keys: string[]) => page.evaluate((keys) => {
	for (const key of keys) {
		document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", {key, bubbles: true, cancelable: true}))
	}
}, keys)

/** The cell's row is inside its scrolling container's viewport, below the header. */
async function expectInView(wrap: Locator, key: number) {
	await expect.poll(() => wrap.locator(`tbody tr[data-row-key="${key}"]`).evaluate((tr) => {
		const box = tr.closest(".quickgrid-container")!
		const view = box.getBoundingClientRect()
		const head = box.querySelector("thead")!.getBoundingClientRect()
		const r = tr.getBoundingClientRect()
		return r.top >= Math.min(head.bottom, view.top + head.height) - 1 && r.bottom <= view.bottom + 1
	})).toBe(true)
}

/** PageUp / PageDown step: rows that fit in the scrolling container below the header. */
const pageStep = (wrap: Locator) => wrap.locator(".quickgrid-container").evaluate((el) => {
	const head = el.querySelector("thead")!.offsetHeight
	const row = (el.querySelector("tbody tr[data-row-key]") as HTMLElement).offsetHeight
	return Math.floor((el.clientHeight - head) / row)
})

for (const id of ["plain", "virtual"]) {
	test.describe(id, () => {
		test("arrow keys faster than a frame each advance one cell", async ({page}) => {
			const wrap = wrapOf(page, id)
			await cell(wrap, 1, 1).click()
			await burst(page, Array(10).fill("ArrowDown"))
			await expect(cell(wrap, 11, 1)).toBeFocused()
			await burst(page, ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowLeft"])
			await expect(cell(wrap, 12, 2)).toBeFocused()
			await expectInView(wrap, 12)
		})

		test("page.keyboard.press ×N without waiting advances N rows", async ({page}) => {
			const wrap = wrapOf(page, id)
			await cell(wrap, 1, 0).click()
			for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowDown")
			await expect(cell(wrap, 26, 0)).toBeFocused()
			await expectInView(wrap, 26)
			for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowUp")
			await expect(cell(wrap, 1, 0)).toBeFocused()
			await expectInView(wrap, 1)
		})

		test("PageDown / PageUp move by the rows in view; Home / End within the row; Ctrl+Home / Ctrl+End to the corners", async ({page}) => {
			const wrap = wrapOf(page, id)
			const last = id === "plain" ? 50 : 1000
			await cell(wrap, 1, 1).click()
			const step = await pageStep(wrap)
			expect(step).toBeGreaterThan(2)
			await page.keyboard.press("PageDown")
			await expect(cell(wrap, 1 + step, 1)).toBeFocused()
			await expectInView(wrap, 1 + step)
			await page.keyboard.press("PageDown")
			await expect(cell(wrap, 1 + 2 * step, 1)).toBeFocused()
			await page.keyboard.press("PageUp")
			await expect(cell(wrap, 1 + step, 1)).toBeFocused()
			await page.keyboard.press("End")
			await expect(cell(wrap, 1 + step, 3)).toBeFocused()
			await page.keyboard.press("Home")
			await expect(cell(wrap, 1 + step, 0)).toBeFocused()
			await page.keyboard.press("Control+End")
			await expect(cell(wrap, last, 3)).toBeFocused()
			await expectInView(wrap, last)
			await page.keyboard.press("PageDown")
			await expect(cell(wrap, last, 3)).toBeFocused()
			await page.keyboard.press("Control+Home")
			await expect(cell(wrap, 1, 0)).toBeFocused()
			await expectInView(wrap, 1)
			await page.keyboard.press("PageUp")
			await expect(cell(wrap, 1, 0)).toBeFocused()
			expect(await focused(page)).toBe("1:0")
		})
	})
}

test("paged: PageUp / PageDown / Ctrl+End stay within the current page", async ({page}) => {
	const wrap = wrapOf(page, "paged")
	await cell(wrap, 3, 1).click()
	await page.keyboard.press("PageDown")
	await expect(cell(wrap, 10, 1)).toBeFocused()
	await page.keyboard.press("PageUp")
	await expect(cell(wrap, 1, 1)).toBeFocused()
	await page.keyboard.press("Control+End")
	await expect(cell(wrap, 10, 3)).toBeFocused()
	await expect(wrap.locator("tbody tr[data-row-key]")).toHaveCount(10)
	await expect(wrap.locator('tbody tr[data-row-key="11"]')).toHaveCount(0)
})
