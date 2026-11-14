import {test, expect, type Page} from "@playwright/test"

/**
 * QuickGrid Phase 5 (2.0.0): row toolbar (hover per pointer type, outside / Escape dismissal),
 * context menu (portalled, follows its cell, header / editor right-clicks), listeners only while open.
 * Fixture: docs/src/routes/test/quickgrid-toolbar/+page.svelte
 */

// Counts the listeners registered on document / window (5.6)
async function trackListeners(page: Page) {
	await page.addInitScript(() => {
		const active: {target: EventTarget; type: string; fn: unknown; capture: boolean}[] = []
		const capture = (o: unknown) => typeof o === "boolean" ? o : !!(o as {capture?: boolean} | undefined)?.capture
		for (const target of [window, document] as EventTarget[]) {
			const add = target.addEventListener.bind(target)
			const remove = target.removeEventListener.bind(target)
			target.addEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, o?: boolean | AddEventListenerOptions) => {
				const c = capture(o)
				if (fn && !active.some((l) => l.target === target && l.type === type && l.fn === fn && l.capture === c)) {
					active.push({target, type, fn, capture: c})
				}
				add(type, fn, o)
			}
			target.removeEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, o?: boolean | EventListenerOptions) => {
				const c = capture(o)
				const i = active.findIndex((l) => l.target === target && l.type === type && l.fn === fn && l.capture === c)
				if (i >= 0) active.splice(i, 1)
				remove(type, fn, o)
			}
		}
		;(window as unknown as {__listenerCount: () => number}).__listenerCount = () => active.length
	})
}

const listenerCount = (page: Page) => page.evaluate(() => (window as unknown as {__listenerCount: () => number}).__listenerCount())
const settle = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

test.describe("QuickGrid Phase 5 — toolbar/menu", () => {
	test.describe("touch-capable laptop", () => {
		test.beforeEach(async ({page}) => {
			await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "maxTouchPoints", {get: () => 5}))
		})

		test("5.1 the hover toolbar shows for the mouse on a touch-screen laptop", async ({page}) => {
			await page.goto("/test/quickgrid-toolbar")
			await page.locator("#hover-wrap tbody tr", {hasText: "Banana"}).hover()
			await expect(page.locator(".row-toolbar")).toBeVisible()
		})
	})

	test.describe("touch", () => {
		test.use({hasTouch: true})

		test("5.1 a tap toggles the hover-mode toolbar", async ({page}) => {
			await page.goto("/test/quickgrid-toolbar")
			const cell = page.locator("#hover-wrap td", {hasText: "City 2"})
			await cell.tap()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			await cell.tap()
			await expect(page.locator(".row-toolbar")).toHaveCount(0)
		})
	})

	test.describe("mouse", () => {
		test.beforeEach(async ({page}) => {
			await trackListeners(page)
			await page.goto("/test/quickgrid-toolbar")
		})

		test("5.2 an outside click closes the click-mode toolbar", async ({page}) => {
			await page.locator("#click-wrap td", {hasText: "Banana"}).click()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			await page.locator("#outside").click()
			await expect(page.locator(".row-toolbar")).toHaveCount(0)
		})

		test("5.2 Escape closes the click-mode toolbar", async ({page}) => {
			await page.locator("#click-wrap td", {hasText: "Banana"}).click()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			await page.keyboard.press("Escape")
			await expect(page.locator(".row-toolbar")).toHaveCount(0)
		})

		test("5.2 Escape in the button-mode toolbar closes it and focuses the row's trigger", async ({page}) => {
			const trigger = page.locator("#button-wrap tbody tr", {hasText: "Banana"}).locator(".toolbar-trigger-btn")
			await trigger.click()
			const star = page.locator(".row-toolbar").getByRole("button", {name: "Star"})
			await star.focus()
			await page.keyboard.press("Escape")
			await expect(page.locator(".row-toolbar")).toHaveCount(0)
			await expect(trigger).toBeFocused()
		})

		test("5.2 Escape in a cell editor cancels the edit while the hover toolbar is open", async ({page}) => {
			const wrap = page.locator("#hover-wrap")
			const cell = wrap.locator("tbody tr").nth(1).locator("td.editable-cell")
			await cell.hover()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			await cell.dblclick()
			await cell.locator("input").fill("Bananas")
			await page.keyboard.press("Escape")
			await expect(wrap.locator("td.editing")).toHaveCount(0)
			await expect(cell).toHaveText("Banana")
		})

		test("5.3 scrolling the grid's container keeps the toolbar, which follows its row", async ({page}) => {
			const wrap = page.locator("#scroll-wrap")
			await wrap.locator("td", {hasText: "Banana"}).click()
			const toolbar = page.locator(".row-toolbar")
			await expect(toolbar).toBeVisible()
			const before = (await toolbar.boundingBox())!
			await wrap.evaluate((el) => el.scrollBy(0, 20))
			await settle(page)
			await expect(toolbar).toBeVisible()
			await expect.poll(async () => Math.round(before.y - (await toolbar.boundingBox())!.y)).toBe(20)
			await wrap.locator(".quickgrid-container").evaluate((el) => el.scrollBy(100, 0))  // the grid's own scroll
			await settle(page)
			await expect(toolbar).toBeVisible()
		})

		test("5.3 scrolling keeps the context menu at its cell; it closes once the row scrolls out of view", async ({page}) => {
			const wrap = page.locator("#scroll-wrap")
			await wrap.locator("td", {hasText: "City 2"}).click({button: "right", position: {x: 10, y: 5}})
			const menu = page.locator(".context-menu")
			await expect(menu).toBeVisible()
			const before = (await menu.boundingBox())!
			await wrap.locator(".quickgrid-container").evaluate((el) => el.scrollBy(100, 0))  // the grid's own scroll
			await settle(page)
			await expect(menu).toBeVisible()
			await expect.poll(async () => Math.round(before.x - (await menu.boundingBox())!.x)).toBe(100)
			await page.evaluate(() => window.scrollBy(0, 30))
			await settle(page)
			await expect(menu).toBeVisible()
			await expect.poll(async () => Math.round(before.y - (await menu.boundingBox())!.y)).toBe(30)
			await wrap.evaluate((el) => el.scrollBy(0, 400))
			await expect(menu).toHaveCount(0)
		})

		test("5.3 the toolbar closes once its row scrolls out of view", async ({page}) => {
			const wrap = page.locator("#scroll-wrap")
			await wrap.locator("td", {hasText: "Apple"}).click()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			await wrap.evaluate((el) => el.scrollBy(0, 400))
			await expect(page.locator(".row-toolbar")).toHaveCount(0)
		})

		test("5.4 a right-click on the header or the filter row closes the menu", async ({page}) => {
			const wrap = page.locator("#hover-wrap")
			const menu = page.locator(".context-menu")
			await wrap.locator("td", {hasText: "City 2"}).click({button: "right"})
			await expect(menu).toBeVisible()
			await wrap.locator("th.column-header", {hasText: "City"}).click({button: "right"})
			await expect(menu).toHaveCount(0)
			await wrap.locator("td", {hasText: "City 2"}).click({button: "right"})
			await expect(menu).toBeVisible()
			await wrap.locator(".filter-input").first().click({button: "right"})
			await expect(menu).toHaveCount(0)
		})

		test("5.4 a right-click in an open editor keeps the native menu", async ({page}) => {
			const cell = page.locator("#hover-wrap tbody tr").nth(1).locator("td.editable-cell")
			await cell.dblclick()
			const input = cell.locator("input")
			await expect(input).toBeVisible()
			await page.evaluate(() => window.addEventListener("contextmenu", (e) => {
				(window as unknown as {__prevented: boolean}).__prevented = e.defaultPrevented
			}))
			await input.click({button: "right"})
			expect(await page.evaluate(() => (window as unknown as {__prevented: boolean}).__prevented)).toBe(false)
			await expect(page.locator(".context-menu")).toHaveCount(0)
		})

		test("5.5 the context menu opens at the pointer under a transformed ancestor", async ({page}) => {
			const cell = page.locator("#transformed-wrap td", {hasText: "City 2"})
			await cell.scrollIntoViewIfNeeded()
			const box = (await cell.boundingBox())!
			await cell.click({button: "right", position: {x: 10, y: 5}})
			const menu = page.locator(".context-menu")
			await expect(menu).toBeVisible()
			const m = (await menu.boundingBox())!
			expect(Math.abs(m.x - (box.x + 10))).toBeLessThan(2)
			expect(Math.abs(m.y - (box.y + 5))).toBeLessThan(2)
			const vp = page.viewportSize()!
			expect(m.y + m.height).toBeLessThanOrEqual(vp.height)
		})

		test("5.6 grids add document / window listeners only while a toolbar or menu is open", async ({page}) => {
			// Warm-up mount: Svelte adds its delegated-event listeners once, on first use
			const wrap = page.locator("#listener-wrap")
			await page.locator("#mount-grids").click()
			await expect(wrap.locator("table")).toHaveCount(3)
			await page.locator("#mount-grids").click()
			await expect(wrap).toHaveCount(0)
			const baseline = await listenerCount(page)
			await page.locator("#mount-grids").click()
			await expect(wrap.locator("table")).toHaveCount(3)
			expect(await listenerCount(page)).toBe(baseline)

			await wrap.locator("td", {hasText: "Banana"}).first().click()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			expect(await listenerCount(page)).toBeGreaterThan(baseline)
			await page.locator("#outside").click()
			await expect(page.locator(".row-toolbar")).toHaveCount(0)
			await expect.poll(() => listenerCount(page)).toBe(baseline)

			await wrap.locator("td", {hasText: "Apple"}).first().click({button: "right"})
			await expect(page.locator(".context-menu")).toBeVisible()
			await page.keyboard.press("Escape")
			await expect(page.locator(".context-menu")).toHaveCount(0)
			await expect.poll(() => listenerCount(page)).toBe(baseline)

			// Unmounted while open
			await wrap.locator("td", {hasText: "Banana"}).first().click()
			await expect(page.locator(".row-toolbar")).toBeVisible()
			await page.evaluate(() => (window as unknown as {__unmountGrids: () => void}).__unmountGrids())
			await expect(wrap).toHaveCount(0)
			await expect.poll(() => listenerCount(page)).toBe(baseline)
		})
	})
})
