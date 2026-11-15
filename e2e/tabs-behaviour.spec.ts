import {test, expect, type Locator, type Page} from "@playwright/test"

/**
 * Tabs: keyboard nav (Home/End, disabled skip, wrap-around, vertical arrows),
 * close button, hidden tabs, swipe-to-navigate on the panels, wrap-mode
 * indicator, menu-mode measurement / swap-into-strip.
 * Fixture: docs/src/routes/test/tabs-behaviour/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/tabs-behaviour")
	await expect(page.locator("#menu button.fluent-tabs-more-btn")).toBeVisible()
})

const selected = (section: Locator) => section.locator("[role=tab][aria-selected=true]")

test("keyboard: arrows skip disabled tabs and wrap; Home/End jump to the ends", async ({page}) => {
	const kb = page.locator("#kb")
	await kb.getByRole("tab", {name: "One"}).click()
	await page.keyboard.press("ArrowRight")
	await expect(selected(kb)).toHaveText("Three")
	await expect(kb.getByRole("tab", {name: "Three"})).toBeFocused()
	await page.keyboard.press("ArrowRight")
	await expect(selected(kb)).toHaveText("Four")
	await page.keyboard.press("ArrowRight")
	await expect(selected(kb)).toHaveText("One")
	await page.keyboard.press("ArrowLeft")
	await expect(selected(kb)).toHaveText("Four")
	await page.keyboard.press("Home")
	await expect(selected(kb)).toHaveText("One")
	await page.keyboard.press("End")
	await expect(selected(kb)).toHaveText("Four")
	// Roving tabindex + panel wiring.
	await expect(kb.getByRole("tab", {name: "Four"})).toHaveAttribute("tabindex", "0")
	await expect(kb.getByRole("tab", {name: "One"})).toHaveAttribute("tabindex", "-1")
	await expect(kb.locator("#k4-panel")).toBeVisible()
	await expect(kb.locator("#k1-panel")).toBeHidden()
})

test("hidden tabs aren't rendered; disabled tabs ignore clicks; close doesn't activate", async ({page}) => {
	const kb = page.locator("#kb")
	await expect(kb.getByRole("tab")).toHaveCount(4)
	await expect(kb.getByRole("tab", {name: "Two"})).toBeDisabled()
	await kb.getByRole("tab", {name: "Three"}).locator("[aria-label='Close tab']").click()
	await expect(page.locator("#log")).toHaveText("close:k3")
	await expect(selected(kb)).toHaveText("One")
})

test("vertical: ArrowDown/ArrowUp move, indicator spans the active tab's height", async ({page}) => {
	const v = page.locator("#vert")
	await expect(v.locator(".fluent-tabs-strip")).toHaveAttribute("style", /width: 120px/)
	await v.getByRole("tab", {name: "Vertical one"}).click()
	await page.keyboard.press("ArrowDown")
	await expect(selected(v)).toHaveAttribute("id", "v2")
	await page.keyboard.press("ArrowUp")
	await page.keyboard.press("ArrowUp")
	await expect(selected(v)).toHaveAttribute("id", "v3")
	await expect(async () => {
		const t = (await selected(v).boundingBox())!
		const i = (await v.locator(".fluent-tabs-active-indicator").boundingBox())!
		expect(Math.abs(i.y - t.y)).toBeLessThan(1.5)
		expect(Math.abs(i.height - t.height)).toBeLessThan(1.5)
		expect(Math.abs(i.x + i.width - (t.x + t.width))).toBeLessThan(1.5)
	}).toPass({timeout: 3000})
})

async function swipe(page: Page, sectionId: string, dx: number, dy: number, startSelector = ".fluent-tab-panel:not([hidden]) .pad") {
	await page.evaluate(([sid, dx, dy, sel]) => {
		const target = document.querySelector(`#${sid} ${sel}`) as HTMLElement
		const r = target.getBoundingClientRect()
		const x = r.left + r.width / 2, y = r.top + r.height / 2
		const touch = (cx: number, cy: number) => new Touch({identifier: 1, target, clientX: cx, clientY: cy})
		const start = touch(x, y), end = touch(x + (dx as number), y + (dy as number))
		target.dispatchEvent(new TouchEvent("touchstart", {bubbles: true, touches: [start], changedTouches: [start]}))
		target.dispatchEvent(new TouchEvent("touchend", {bubbles: true, touches: [], changedTouches: [end]}))
	}, [sectionId, dx, dy, startSelector] as const)
}

test("swipe on the panels navigates (skipping disabled); short / diagonal / interactive swipes don't", async ({page}) => {
	const s = page.locator("#swipe")
	await swipe(page, "swipe", -30, 0)
	await expect(selected(s)).toHaveText("S one")
	await swipe(page, "swipe", -80, 70)
	await expect(selected(s)).toHaveText("S one")
	await swipe(page, "swipe", -80, 0, ".fluent-tab-panel:not([hidden]) #swipe-input")
	await expect(selected(s)).toHaveText("S one")
	await swipe(page, "swipe", -80, 10)
	await expect(selected(s)).toHaveText("S three")
	await swipe(page, "swipe", -80, 0)
	await expect(selected(s)).toHaveText("S three")
	await swipe(page, "swipe", 80, 0)
	await expect(selected(s)).toHaveText("S one")

	const n = page.locator("#noswipe")
	await swipe(page, "noswipe", -80, 0)
	await expect(selected(n)).toHaveText("N one")
})

test("wrap mode: tabs flow onto rows and the indicator follows the active tab's row", async ({page}) => {
	const w = page.locator("#wrap")
	const list = w.locator("[role=tablist]")
	const box = (await list.boundingBox())!
	const tabBox = (await w.getByRole("tab").first().boundingBox())!
	expect(box.height).toBeGreaterThan(tabBox.height * 2)
	await expect(w.locator(".fluent-tabs-scroll-btn")).toHaveCount(0)
	await expect(async () => {
		const t = (await selected(w).boundingBox())!
		const i = (await w.locator(".fluent-tabs-active-indicator").boundingBox())!
		expect(Math.abs(i.x - t.x)).toBeLessThan(1.5)
		expect(Math.abs(i.y + i.height - (t.y + t.height))).toBeLessThan(1.5)
	}).toPass({timeout: 3000})
})

const stripIds = (section: Locator) => section.locator("[role=tablist] [role=tab]").evaluateAll(els => els.map(el => el.id))

test("menu mode: only fitting tabs render; a picked overflow tab swaps into the last visible slot", async ({page}) => {
	const m = page.locator("#menu")
	const before = await stripIds(m)
	expect(before.length).toBeGreaterThan(1)
	expect(before.length).toBeLessThan(10)
	expect(before).toEqual(Array.from({length: before.length}, (_, i) => `m${i + 1}`))
	// Measured strip never overflows: last tab + more button stay inside the tablist.
	const listBox = (await m.locator("[role=tablist]").boundingBox())!
	const moreBox = (await m.locator("button.fluent-tabs-more-btn").boundingBox())!
	expect(moreBox.x + moreBox.width).toBeLessThanOrEqual(listBox.x + listBox.width + 1)
	await expect(m.locator("button.fluent-tabs-more-btn")).toHaveAttribute("aria-expanded", "false")

	await m.locator("button.fluent-tabs-more-btn").click()
	await expect(m.locator("button.fluent-tabs-more-btn")).toHaveAttribute("aria-expanded", "true")
	const menu = page.locator(".fluent-tabs-overflow-menu")
	await expect(menu.locator("fluent-menu-item")).toHaveCount(10 - before.length)
	await menu.locator("fluent-menu-item", {hasText: "Menu 10"}).click()
	const after = await stripIds(m)
	expect(after).toEqual([...before.slice(0, -1), "m10"])
	await expect(selected(m)).toHaveAttribute("id", "m10")

	// External activation of an overflow tab also swaps it in.
	await page.locator("#set-m9").click()
	await expect.poll(() => stripIds(m)).toEqual([...before.slice(0, -1), "m9"])
	await expect(selected(m)).toHaveAttribute("id", "m9")
})

test("menu mode re-measures when the container shrinks", async ({page}) => {
	const m = page.locator("#menu")
	const before = (await stripIds(m)).length
	await m.evaluate(el => (el.style.inlineSize = "220px"))
	await expect.poll(async () => (await stripIds(m)).length).toBeLessThan(before)
})
