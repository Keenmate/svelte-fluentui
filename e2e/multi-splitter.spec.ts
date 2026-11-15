import {test, expect, type Page} from "@playwright/test"

/**
 * MultiSplitter: keyboard resize (arrows / Home / End per primary neighbour),
 * minimize / restore (Enter, dblclick, rail click, data-multisplitter-toggle),
 * pointer drag + snap-to-rail, vertical orientation, accordion mode and
 * persisted minimized state.
 * Fixture: docs/src/routes/test/multi-splitter/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/multi-splitter")
	await page.evaluate(() => localStorage.clear())
	await page.reload()
	await expect(page.locator("#h3 > .fluent-multi-splitter-gutter").first()).toHaveAttribute("aria-valuenow", "200")
})

const pane = (page: Page, id: string, i: number) => page.locator(`#${id} > .fluent-multi-splitter-pane`).nth(i)
const gutter = (page: Page, id: string, i: number) => page.locator(`#${id} > .fluent-multi-splitter-gutter`).nth(i)
const sizeOf = (page: Page, id: string, i: number, axis: "width" | "height" = "width") =>
	pane(page, id, i).evaluate((el, a) => Math.round(el.getBoundingClientRect()[a]), axis)
const sizes = (page: Page, id: string) =>
	page.locator(`#${id} > .fluent-multi-splitter-pane`).evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().width)))

test("initial sizes: sized panes keep their size, unsized share the rest; gutters carry ARIA", async ({page}) => {
	await expect.poll(() => sizes(page, "h3")).toEqual([200, 238, 150])
	const g0 = gutter(page, "h3", 0)
	await expect(g0).toHaveAttribute("role", "separator")
	await expect(g0).toHaveAttribute("aria-orientation", "vertical")
	await expect(g0).toHaveAttribute("aria-valuemin", "100")
	await expect(gutter(page, "h3", 1)).toHaveAttribute("aria-valuenow", "238")
	await expect(page.locator("#h3 > .fluent-multi-splitter-gutter")).toHaveCount(2)
})

test("keyboard: arrows step the primary (edge-closer) pane, Home/End go to its min/max", async ({page}) => {
	const g0 = gutter(page, "h3", 0)
	await g0.focus()
	await page.keyboard.press("ArrowRight")
	await expect.poll(() => sizes(page, "h3")).toEqual([210, 228, 150])
	await page.keyboard.press("ArrowLeft")
	await page.keyboard.press("ArrowUp")
	await expect.poll(() => sizes(page, "h3")).toEqual([190, 248, 150])
	await page.keyboard.press("End")
	await expect.poll(() => sizes(page, "h3")).toEqual([338, 100, 150])
	await page.keyboard.press("Home")
	await expect.poll(() => sizes(page, "h3")).toEqual([100, 338, 150])

	// Gutter 1's primary is the last pane (closer to the end edge): ArrowRight shrinks it.
	await gutter(page, "h3", 1).focus()
	await page.keyboard.press("ArrowRight")
	await expect.poll(() => sizes(page, "h3")).toEqual([100, 348, 140])
	await page.keyboard.press("End")
	await expect.poll(() => sizeOf(page, "h3", 2)).toBe(250)
})

test("Enter on a gutter toggles the minimizable primary pane; events fire", async ({page}) => {
	const g0 = gutter(page, "h3", 0)
	await g0.focus()
	await page.keyboard.press("Enter")
	await expect(pane(page, "h3", 0)).toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizeOf(page, "h3", 0)).toBe(40)
	await expect(page.locator("#log")).toHaveText("h3:collapse:0")
	await page.keyboard.press(" ")
	await expect(pane(page, "h3", 0)).not.toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizes(page, "h3")).toEqual([200, 238, 150])
	await expect(page.locator("#log")).toHaveText("h3:collapse:0 | h3:expand:0")
})

test("dblclick on a gutter minimizes; clicking the rail restores", async ({page}) => {
	await gutter(page, "h3", 1).dblclick()
	await expect(pane(page, "h3", 2)).toHaveClass(/fluent-multi-splitter-pane--minimized/)
	// Freed space spreads over the unpinned panes in proportion to their size.
	await expect.poll(() => sizes(page, "h3")).toEqual([250, 298, 40])
	await pane(page, "h3", 2).click()
	await expect(pane(page, "h3", 2)).not.toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizes(page, "h3")).toEqual([200, 238, 150])
	await expect(page.locator("#log")).toHaveText("h3:collapse:2 | h3:expand:2")
})

async function drag(page: Page, id: string, g: number, dx: number, dy = 0) {
	const box = (await gutter(page, id, g).boundingBox())!
	const x = box.x + box.width / 2, y = box.y + box.height / 2
	await page.mouse.move(x, y)
	await page.mouse.down()
	await page.mouse.move(x + dx / 2, y + dy / 2, {steps: 4})
	await page.mouse.move(x + dx, y + dy, {steps: 4})
	await page.mouse.up()
}

test("pointer drag resizes the primary pane and the neighbour absorbs it", async ({page}) => {
	await drag(page, "h3", 0, 50)
	await expect.poll(() => sizes(page, "h3")).toEqual([250, 188, 150])
	await expect(gutter(page, "h3", 0)).toHaveAttribute("aria-valuenow", "250")
	await expect(page.locator("#h3")).not.toHaveClass(/fluent-multi-splitter--dragging/)
	await expect(page.locator("#h3 .fluent-multi-splitter-gutter--active")).toHaveCount(0)
})

test("dragging below the snap threshold rails the pane; dragging outward again releases it", async ({page}) => {
	await drag(page, "h3", 0, -150)
	await expect(pane(page, "h3", 0)).toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizeOf(page, "h3", 0)).toBe(40)
	// (The snap re-fires onPaneCollapse on each further frame below the threshold.)
	await expect(page.locator("#log")).toHaveText(/^h3:collapse:0( \| h3:collapse:0)*$/)
	// Inward drag on a railed pane is inert.
	await drag(page, "h3", 0, -30)
	await expect.poll(() => sizeOf(page, "h3", 0)).toBe(40)
	// Outward drag grows it again.
	await drag(page, "h3", 0, 150)
	await expect(pane(page, "h3", 0)).not.toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizeOf(page, "h3", 0)).toBe(190)
	await expect(page.locator("#log")).toHaveText(/^h3:collapse:0( \| h3:collapse:0)* \| h3:expand:0$/)
})

test("vertical orientation: horizontal separator, ArrowDown grows the top pane by step", async ({page}) => {
	const g = gutter(page, "v", 0)
	await expect(g).toHaveAttribute("aria-orientation", "horizontal")
	await expect(pane(page, "v", 0)).toHaveClass(/fluent-multi-splitter-pane--vertical/)
	await expect.poll(() => sizeOf(page, "v", 0, "height")).toBe(100)
	await g.focus()
	await page.keyboard.press("ArrowDown")
	await expect.poll(() => sizeOf(page, "v", 0, "height")).toBe(120)
	await expect.poll(() => sizeOf(page, "v", 1, "height")).toBe(174)
})

test("accordion mode: too narrow for all mins keeps one pane open; restoring another rails the rest", async ({page}) => {
	await expect(page.locator("#acc")).toHaveClass(/fluent-multi-splitter--accordion/)
	const minimized = () => page.locator("#acc > .fluent-multi-splitter-pane").evaluateAll(els =>
		els.map(el => el.classList.contains("fluent-multi-splitter-pane--minimized")))
	await expect.poll(minimized).toEqual([false, true, true])
	await expect.poll(() => sizes(page, "acc")).toEqual([158, 40, 40])
	await pane(page, "acc", 1).click()
	await expect.poll(minimized).toEqual([true, false, true])
	await expect.poll(() => sizes(page, "acc")).toEqual([40, 158, 40])
})

test("data-multisplitter-toggle toggles its pane; the minimized state persists with persistKey", async ({page}) => {
	await page.locator("#pm-toggle").click()
	await expect(pane(page, "pm", 0)).toHaveClass(/fluent-multi-splitter-pane--minimized/)
	const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("fluent-multi-splitter:e2e-split-min") || "null"))
	expect(saved).toMatchObject({v: 2, minimized: [true, false]})
	await page.reload()
	await expect(pane(page, "pm", 0)).toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizeOf(page, "pm", 0)).toBe(40)
	await pane(page, "pm", 0).click()
	await expect(pane(page, "pm", 0)).not.toHaveClass(/fluent-multi-splitter-pane--minimized/)
	await expect.poll(() => sizeOf(page, "pm", 0)).toBe(200)
})
