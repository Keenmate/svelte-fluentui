import {test, expect, type Page, type Locator} from "@playwright/test"

/**
 * Popup positioning & sizing (helpers/floating.ts, 2.0.0 plan 09): a popup opens below unless
 * there's more room above, is capped to the room left to the viewport edge and to its own
 * `maxDropdownHeight`, keeps its side while a filter shrinks it, decides again when it grows
 * (async results), and matches the anchor width.
 * Fixture: docs/src/routes/test/positioning/+page.svelte
 */

test.use({viewport: {width: 1280, height: 720}})

test.beforeEach(async ({page}) => {
	await page.goto("/test/positioning")
})

const box = async (l: Locator) => (await l.boundingBox())!

async function openSelect(page: Page, id: string) {
	const trigger = page.locator(`#${id} [role=combobox]`)
	await trigger.click()
	const list = page.locator(".select-listbox-popover")
	await expect(list).toBeVisible()
	return {trigger, list}
}

async function openCombo(page: Page, id: string) {
	const input = page.locator(`#${id} input[role=combobox]`)
	await input.click()
	const list = page.locator(".combobox-listbox")
	await expect(list).toBeVisible()
	return {input, list}
}

test("opens below when there's room, capped to the 300px default, as wide as the trigger", async ({page}) => {
	const {trigger, list} = await openSelect(page, "top-select")
	await expect.poll(async () => (await box(list)).y).toBeGreaterThanOrEqual((await box(trigger)).y + (await box(trigger)).height - 1)
	const l = await box(list)
	expect(l.height).toBeLessThanOrEqual(300.5)
	expect(l.height).toBeGreaterThan(250)
	expect(Math.abs(l.width - (await box(trigger)).width)).toBeLessThan(1)
})

test("maxDropdownHeight caps the dropdown", async ({page}) => {
	const {list} = await openSelect(page, "capped-select")
	await expect.poll(async () => (await box(list)).height).toBeLessThanOrEqual(120.5)
})

test("opens above when there's more room there", async ({page}) => {
	const {trigger, list} = await openSelect(page, "bottom-select")
	const t = await box(trigger)
	await expect.poll(async () => {
		const l = await box(list)
		return l.y + l.height
	}).toBeLessThanOrEqual(t.y + 1)
})

test("a short viewport caps the dropdown to the room left", async ({page}) => {
	await page.setViewportSize({width: 1280, height: 200})
	const {list} = await openSelect(page, "top-select")
	await expect.poll(async () => {
		const l = await box(list)
		return l.y + l.height
	}).toBeLessThanOrEqual(200 - 8 + 0.5)
	expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
})

test("keeps its side while a filter shrinks the list", async ({page}) => {
	const {input, list} = await openCombo(page, "filter-combo")
	const i = await box(input)
	await expect.poll(async () => (await box(list)).y + (await box(list)).height).toBeLessThanOrEqual(i.y + 1)
	await input.pressSequentially("Item 39")
	await expect(list.locator(".fluent-option:not([data-filtered-out])")).toHaveCount(1)
	// One row would fit below now; the list stays above.
	const l = await box(list)
	expect(l.y + l.height).toBeLessThanOrEqual(i.y + 1)
})

test("decides again when async results make it grow past the room below", async ({page}) => {
	const {input, list} = await openCombo(page, "async-combo")
	const i = await box(input)
	// One option: fits below.
	await expect.poll(async () => (await box(list)).y).toBeGreaterThanOrEqual(i.y + i.height - 1)
	// 40 options arrive: the room below is ~120px, above is ~550px — it moves up.
	await expect.poll(async () => (await box(list)).y + (await box(list)).height, {timeout: 3000}).toBeLessThanOrEqual(i.y + 1)
	expect((await box(list)).height).toBeGreaterThan(250)
})

test("DatePicker popup is capped to the viewport and scrolls", async ({page}) => {
	await page.setViewportSize({width: 1280, height: 400})
	await page.locator("#date .calendar-button").click()
	const popup = page.locator(".datepicker-popup")
	await expect(popup).toBeVisible()
	await expect.poll(async () => {
		const p = await box(popup)
		return p.y >= 8 - 0.5 && p.y + p.height <= 400 - 8 + 0.5
	}).toBe(true)
	expect(await popup.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
})

test("field dropdowns sit 8px (designUnit × 2) from the field; --fluent-popup-offset on an ancestor overrides it", async ({page}) => {
	const gap = async (id: string) => {
		const {trigger, list} = await openSelect(page, id)
		await expect.poll(async () => (await list.evaluate((el) => getComputedStyle(el).opacity))).toBe("1")
		const t = await box(trigger)
		const l = await box(list)
		await page.keyboard.press("Escape")
		await expect(list).toHaveCount(0)
		return l.y >= t.y ? l.y - (t.y + t.height) : t.y - (l.y + l.height)
	}
	expect(Math.abs((await gap("top-select")) - 8)).toBeLessThan(0.5)
	expect(Math.abs((await gap("bottom-select")) - 8)).toBeLessThan(0.5)
	await page.locator("#top-select").evaluate((el) => el.style.setProperty("--fluent-popup-offset", "2px"))
	expect(Math.abs((await gap("top-select")) - 2)).toBeLessThan(0.5)
})
