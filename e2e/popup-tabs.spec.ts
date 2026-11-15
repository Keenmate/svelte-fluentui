import {test, expect, type Locator, type Page} from "@playwright/test"

/**
 * Tabs (2.0.0 Phase 3): overflow menu light dismiss via helpers/dismiss.ts
 * (outside press / focus / scroll) and RTL-correct scroll mode (scroll
 * buttons, scroll direction, active indicator, arrow keys).
 * Fixture: docs/src/routes/test/popup-tabs/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/popup-tabs")
})

const menu = (page: Page) => page.locator(".fluent-tabs-overflow-menu")

async function openOverflow(page: Page) {
	await page.locator("#menu button.fluent-tabs-more-btn").click()
	await expect(menu(page)).toBeVisible()
}

test.describe("overflow menu", () => {
	test("outside press closes; pressing inside the menu does not", async ({page}) => {
		await openOverflow(page)
		await menu(page).locator("fluent-menu").dispatchEvent("pointerdown")
		await expect(menu(page)).toBeVisible()
		await page.locator("#outside").click()
		await expect(menu(page)).toBeHidden()
	})

	test("focus moving outside closes it", async ({page}) => {
		await openOverflow(page)
		await page.locator("#outside").focus()
		await expect(menu(page)).toBeHidden()
	})

	test("outside scroll closes it", async ({page}) => {
		await openOverflow(page)
		await page.locator("#scroller").evaluate(el => el.scrollTop = 50)
		await expect(menu(page)).toBeHidden()
	})

	test("the more button toggles; picking a hidden tab activates it", async ({page}) => {
		await openOverflow(page)
		await page.locator("#menu button.fluent-tabs-more-btn").click()
		await expect(menu(page)).toBeHidden()
		await openOverflow(page)
		await menu(page).locator("fluent-menu-item", {hasText: "Menu tab t12"}).click()
		await expect(menu(page)).toBeHidden()
		await expect(page.locator("#menu [role=tab][aria-selected=true]")).toHaveText(/Menu tab t12/)
	})
})

/** Asserts the indicator sits under (horizontal) / beside (vertical) the active tab. */
async function expectIndicatorUnder(section: Locator) {
	const tab = section.locator("[role=tab][aria-selected=true]")
	const indicator = section.locator(".fluent-tabs-active-indicator")
	await expect(async () => {
		const t = (await tab.boundingBox())!
		const i = (await indicator.boundingBox())!
		expect(Math.abs(i.x - t.x)).toBeLessThan(1.5)
		expect(Math.abs(i.width - t.width)).toBeLessThan(1.5)
		expect(Math.abs(i.y + i.height - (t.y + t.height))).toBeLessThan(1.5)
	}).toPass({timeout: 3000})
}

for (const dir of ["ltr", "rtl"] as const) {
	test.describe(`scroll mode (${dir})`, () => {
		test("start/end buttons enable correctly and scroll toward their side", async ({page}) => {
			const section = page.locator(`#${dir}`)
			const list = section.locator("[role=tablist]")
			const start = section.locator(".fluent-tabs-scroll-btn-start")
			const end = section.locator(".fluent-tabs-scroll-btn-end")

			// At the start: only the end button.
			await expect(end).toBeVisible()
			await expect(start).toHaveCount(0)

			// The end button sits on the inline-end side.
			const listBox = (await list.boundingBox())!
			const endBox = (await end.boundingBox())!
			if (dir === "rtl") expect(endBox.x).toBeLessThan(listBox.x + listBox.width / 2)
			else expect(endBox.x).toBeGreaterThan(listBox.x + listBox.width / 2)

			await end.click()
			await expect.poll(() => list.evaluate(el => Math.abs(el.scrollLeft))).toBeGreaterThan(50)
			await expect(start).toBeVisible()

			// Scroll fully to the end: end button disappears.
			await list.evaluate((el, rtl) => el.scrollTo({left: (rtl ? -1 : 1) * el.scrollWidth, behavior: "instant"}), dir === "rtl")
			await expect(end).toHaveCount(0)
			await expect(start).toBeVisible()

			await start.click()
			await expect(end).toBeVisible()
		})

		test("active indicator sits under the active tab, also after scrolling", async ({page}) => {
			const section = page.locator(`#${dir}`)
			await expectIndicatorUnder(section)
			await section.locator(".fluent-tabs-scroll-btn-end").click()
			await section.getByRole("tab", {name: "Tab t5"}).click()
			await expectIndicatorUnder(section)
		})
	})
}

test("RTL: ArrowLeft moves to the next tab, ArrowRight to the previous", async ({page}) => {
	const section = page.locator("#rtl")
	await section.getByRole("tab", {name: "Tab t2"}).click()
	await page.keyboard.press("ArrowLeft")
	await expect(section.locator("[role=tab][aria-selected=true]")).toHaveText("Tab t3")
	await page.keyboard.press("ArrowRight")
	await page.keyboard.press("ArrowRight")
	await expect(section.locator("[role=tab][aria-selected=true]")).toHaveText("Tab t1")
})

test("RTL vertical: indicator sits on the inline-end (left) edge of the active tab", async ({page}) => {
	const section = page.locator("#rtl-v")
	const tab = section.locator("[role=tab][aria-selected=true]")
	const indicator = section.locator(".fluent-tabs-active-indicator")
	await expect(async () => {
		const t = (await tab.boundingBox())!
		const i = (await indicator.boundingBox())!
		expect(Math.abs(i.x - t.x)).toBeLessThan(1.5)
		expect(Math.abs(i.y - t.y)).toBeLessThan(1.5)
		expect(Math.abs(i.height - t.height)).toBeLessThan(1.5)
	}).toPass({timeout: 3000})
})
