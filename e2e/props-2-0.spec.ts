import {test, expect} from "@playwright/test"

/**
 * 2.0.0 prop audit: props whose JSDoc promised behaviour they didn't have now
 * work — TabPanel `defer`, SiteSettings `children`, Listbox `height`, Grid
 * `adaptiveRendering` without `onBreakpointChange`, GridItem `hiddenWhen` on
 * resize, Spacer CSS-length `width`, Dialog ARIA attribute names — plus a
 * smoke test for the now-public Chip.
 * Fixture: docs/src/routes/test/props-2-0/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/props-2-0")
})

test("TabPanel defer: content mounts on first activation and stays mounted", async ({page}) => {
	// Non-deferred panels render their (hidden) content right away.
	await expect(page.locator(".eager-content")).toHaveCount(1)
	await expect(page.locator(".deferred-content")).toHaveCount(0)

	await page.locator("#toggle-panel").click()
	await expect(page.locator(".deferred-content")).toBeVisible()

	await page.locator("#toggle-panel").click()
	await expect(page.locator("#deferred-panel")).toHaveAttribute("hidden", /.*/)
	await expect(page.locator(".deferred-content")).toHaveCount(1)
})

test("SiteSettings renders children below the built-in settings", async ({page}) => {
	await page.locator("#open-settings").click()
	await expect(page.locator(".extra-setting")).toBeVisible()
	await expect(page.locator(".extra-setting")).toHaveText("Extra app setting")
})

test("Listbox height caps the listbox and scrolls the overflow", async ({page}) => {
	const listbox = page.locator("fluent-listbox#lb-height")
	const metrics = await listbox.evaluate((el) => ({
		height: el.getBoundingClientRect().height,
		clientHeight: el.clientHeight,
		scrollHeight: el.scrollHeight
	}))
	expect(metrics.height).toBeLessThanOrEqual(100.5)
	expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
})

test("Grid adaptiveRendering works without onBreakpointChange", async ({page}) => {
	// The grid is 500px wide → xs: only items with an xs span render.
	await expect(page.locator("#adaptive-xs")).toBeVisible()
	await expect(page.locator("#adaptive-md")).toHaveCount(0)
})

test("GridItem hiddenWhen follows window resize", async ({page}) => {
	await page.setViewportSize({width: 1280, height: 720})
	await expect(page.locator("#hidden-md-up")).toHaveCount(0)

	await page.setViewportSize({width: 800, height: 720})
	await expect(page.locator("#hidden-md-up")).toBeVisible()

	await page.setViewportSize({width: 1280, height: 720})
	await expect(page.locator("#hidden-md-up")).toHaveCount(0)
})

test("Spacer width: numbers get px, CSS lengths pass through", async ({page}) => {
	const width = (id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().width)
	const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
	expect(await width("spacer-rem")).toBeCloseTo(rem, 1)
	expect(await width("spacer-num")).toBeCloseTo(20, 1)
	expect(await width("spacer-numstr")).toBeCloseTo(30, 1)
})

test("Dialog ARIA props reach <fluent-dialog> under their real attribute names", async ({page}) => {
	await page.locator("#open-dialog").click()
	const dialog = page.locator("fluent-dialog#aria-dialog")
	await expect(dialog).toHaveAttribute("aria-label", "Labelled dialog")
	await expect(dialog).toHaveAttribute("aria-labelledby", "dlg-title")
	await expect(dialog).toHaveAttribute("aria-describedby", "dlg-desc")

	// FAST mirrors them onto the inner role="dialog" element.
	const inner = await dialog.evaluate((el) => {
		const control = el.shadowRoot?.querySelector("[role='dialog']")
		return {
			label: control?.getAttribute("aria-label"),
			labelledby: control?.getAttribute("aria-labelledby"),
			describedby: control?.getAttribute("aria-describedby")
		}
	})
	expect(inner).toEqual({label: "Labelled dialog", labelledby: "dlg-title", describedby: "dlg-desc"})
})

test("Dialog modal={false} makes <fluent-dialog> non-modal", async ({page}) => {
	await page.locator("#open-nonmodal").click()
	const ariaModal = await page
		.locator("fluent-dialog#nonmodal-dialog")
		.evaluate((el) => el.shadowRoot?.querySelector("[role='dialog']")?.getAttribute("aria-modal"))
	expect(ariaModal).toBe("false")
})

test("Chip (public export): renders text, removes via button and keyboard", async ({page}) => {
	const chip = page.locator("#chip")
	await expect(chip).toContainText("Prague")
	const remove = chip.getByRole("button", {name: "Remove Prague"})
	await remove.click()
	await expect(page.locator("#chip-removed")).toHaveText("1")

	await expect(remove).toHaveAttribute("tabindex", "-1")
	const focusable = page.locator("#chip-focusable").getByRole("button", {name: "Remove Tab"})
	await expect(focusable).toHaveAttribute("tabindex", "0")
	await focusable.focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#chip-removed")).toHaveText("2")

	await expect(page.locator("#chip-static")).toContainText("Static")
	await expect(page.locator("#chip-static").getByRole("button")).toHaveCount(0)
})
