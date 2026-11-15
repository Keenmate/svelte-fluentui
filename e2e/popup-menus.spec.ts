import {test, expect, type Page} from "@playwright/test"

/**
 * MenuButton / ContextMenu popup behaviour on the shared helpers (2.0.0 Phase 3):
 * `dismissOnOutside` (outside press, focus moving away, ContextMenu scroll) and
 * ListNav keyboard navigation over enabled items (disabled items, dividers and group
 * labels skipped), Enter runs the item, Escape / item / Tab return focus.
 * Fixture: docs/src/routes/test/popup-menus/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/popup-menus")
})

const mbItem = (page: Page, text: string) =>
	page.locator(".fluent-menu-button-menu fluent-menu-item", {hasText: new RegExp(`^\\s*${text}\\s*$`)})
const cmItem = (page: Page, text: string) =>
	page.locator(".fluent-context-menu:not(.fluent-context-submenu) > button", {hasText: text})
const subItem = (page: Page, text: string) => page.locator(".fluent-context-submenu > button", {hasText: text})

async function openContextMenu(page: Page) {
	await page.locator("#cm-zone").click({button: "right", position: {x: 20, y: 20}})
	await expect(page.locator("#cm-open")).toHaveText("true")
}

test.describe("MenuButton", () => {
	test("ArrowDown on the button opens the menu on the first item; arrows skip disabled items and dividers", async ({page}) => {
		await page.locator("#mb").focus()
		await page.keyboard.press("ArrowDown")
		await expect(page.locator("#mb-open")).toHaveText("true")
		await expect(mbItem(page, "Cut")).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(mbItem(page, "Paste")).toBeFocused()
		await page.keyboard.press("End")
		await expect(mbItem(page, "Last")).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(mbItem(page, "Last")).toBeFocused()
		await page.keyboard.press("Home")
		await expect(mbItem(page, "Cut")).toBeFocused()
		await page.keyboard.press("ArrowUp")
		await expect(mbItem(page, "Cut")).toBeFocused()
	})

	test("ArrowUp on the button opens the menu on the last enabled item", async ({page}) => {
		await page.locator("#mb").focus()
		await page.keyboard.press("ArrowUp")
		await expect(mbItem(page, "Last")).toBeFocused()
		await page.keyboard.press("ArrowUp")
		await expect(mbItem(page, "Paste")).toBeFocused()
		await page.keyboard.press("ArrowUp")
		await expect(mbItem(page, "Cut")).toBeFocused()
	})

	test("Enter on an item runs it and returns focus to the button", async ({page}) => {
		await page.locator("#mb").focus()
		await page.keyboard.press("ArrowDown")
		await page.keyboard.press("ArrowDown")
		await expect(mbItem(page, "Paste")).toBeFocused()
		await page.keyboard.press("Enter")
		await expect(page.locator("#log")).toHaveText("mb:paste")
		await expect(page.locator("#mb-open")).toHaveText("false")
		await expect(page.locator("#mb")).toBeFocused()
	})

	test("Enter on the button opens with focus on the first item; Escape closes back to the button", async ({page}) => {
		await page.locator("#mb").focus()
		await page.keyboard.press("Enter")
		await expect(page.locator("#mb-open")).toHaveText("true")
		await expect(mbItem(page, "Cut")).toBeFocused()
		await page.keyboard.press("Escape")
		await expect(page.locator("#mb-open")).toHaveText("false")
		await expect(page.locator("#mb")).toBeFocused()
	})

	test("Tab inside the menu closes it and moves on from the button", async ({page}) => {
		await page.locator("#mb").focus()
		await page.keyboard.press("ArrowDown")
		await expect(mbItem(page, "Cut")).toBeFocused()
		await page.keyboard.press("Tab")
		await expect(page.locator("#mb-open")).toHaveText("false")
		await expect(page.locator("#outside")).toBeFocused()
	})

	test("focus moving to another field closes the menu", async ({page}) => {
		await page.locator("#mb").click()
		await expect(page.locator("#mb-open")).toHaveText("true")
		await page.locator("#outside").focus()
		await expect(page.locator("#mb-open")).toHaveText("false")
	})

	test("mouse: click opens, an item click runs it, an outside press closes", async ({page}) => {
		await page.locator("#mb").click()
		await mbItem(page, "Cut").click()
		await expect(page.locator("#log")).toHaveText("mb:cut")
		await expect(page.locator("#mb-open")).toHaveText("false")
		await page.locator("#mb").click()
		await expect(page.locator("#mb-open")).toHaveText("true")
		await page.mouse.click(1200, 900)
		await expect(page.locator("#mb-open")).toHaveText("false")
	})

	test("in a Dialog: an item click still runs (focus-trap exception)", async ({page}) => {
		await page.locator("#open-dialog").click()
		await page.locator("#dialog-mb").click()
		await mbItem(page, "Paste").click()
		await expect(page.locator("#log")).toHaveText("mb:paste")
		await expect(page.locator("#dialog-open")).toHaveText("true")
	})
})

test.describe("ContextMenu", () => {
	test("arrows skip disabled items, dividers and labels; Enter runs; focus returns to the zone", async ({page}) => {
		await page.locator("#cm-zone").focus()
		await openContextMenu(page)
		await page.keyboard.press("ArrowDown")
		await expect(cmItem(page, "Open")).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(cmItem(page, "New")).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(cmItem(page, "Rename")).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(cmItem(page, "Rename")).toBeFocused()
		await page.keyboard.press("Home")
		await expect(cmItem(page, "Open")).toBeFocused()
		await page.keyboard.press("Enter")
		await expect(page.locator("#log")).toHaveText("cm:open")
		await expect(page.locator("#cm-open")).toHaveText("false")
		await expect(page.locator("#cm-zone")).toBeFocused()
	})

	test("submenu: ArrowRight opens it on its first item, arrows skip its disabled item, ArrowLeft goes back", async ({page}) => {
		await openContextMenu(page)
		await page.keyboard.press("ArrowDown")
		await page.keyboard.press("ArrowDown")
		await expect(cmItem(page, "New")).toBeFocused()
		await page.keyboard.press("ArrowRight")
		await expect(subItem(page, "Document")).toBeFocused()
		await page.keyboard.press("ArrowDown")
		await expect(subItem(page, "Sheet")).toBeFocused()
		await page.keyboard.press("ArrowLeft")
		await expect(cmItem(page, "New")).toBeFocused()
		await expect(page.locator(".fluent-context-submenu")).toHaveCount(0)
		await page.keyboard.press("ArrowRight")
		await page.keyboard.press("End")
		await expect(subItem(page, "Sheet")).toBeFocused()
		await page.keyboard.press("Enter")
		await expect(page.locator("#log")).toHaveText("cm:sheet")
		await expect(page.locator("#cm-open")).toHaveText("false")
	})

	test("Escape closes the submenu first (focus back on its trigger), then the menu", async ({page}) => {
		await openContextMenu(page)
		await page.keyboard.press("ArrowDown")
		await page.keyboard.press("ArrowDown")
		await page.keyboard.press("ArrowRight")
		await expect(subItem(page, "Document")).toBeFocused()
		await page.keyboard.press("Escape")
		await expect(page.locator(".fluent-context-submenu")).toHaveCount(0)
		await expect(cmItem(page, "New")).toBeFocused()
		await page.keyboard.press("Escape")
		await expect(page.locator("#cm-open")).toHaveText("false")
	})

	test("focus moving to another field closes the menu", async ({page}) => {
		await openContextMenu(page)
		await page.locator("#outside").focus()
		await expect(page.locator("#cm-open")).toHaveText("false")
	})

	test("hover still opens the submenu and a click runs its item", async ({page}) => {
		await openContextMenu(page)
		await cmItem(page, "New").hover()
		await subItem(page, "Document").click()
		await expect(page.locator("#log")).toHaveText("cm:doc")
	})

	test("outside scroll closes; scrolling inside does not", async ({page}) => {
		await openContextMenu(page)
		await page.locator(".fluent-context-menu").first().evaluate(el => el.dispatchEvent(new Event("scroll")))
		await expect(page.locator("#cm-open")).toHaveText("true")
		await page.locator("#scroller").evaluate(el => (el.scrollTop = 100))
		await expect(page.locator("#cm-open")).toHaveText("false")
	})

	test("right-click elsewhere closes; right-click on the zone again re-opens at the new spot", async ({page}) => {
		await openContextMenu(page)
		await page.mouse.click(1200, 900, {button: "right"})
		await expect(page.locator("#cm-open")).toHaveText("false")
		await openContextMenu(page)
		const first = await page.locator(".fluent-context-menu").first().boundingBox()
		await page.locator("#cm-zone").click({button: "right", position: {x: 280, y: 100}})
		await expect(page.locator("#cm-open")).toHaveText("true")
		await expect.poll(async () => (await page.locator(".fluent-context-menu").first().boundingBox())?.x).toBeGreaterThan(first!.x + 100)
		await page.locator("#cm-zone").click({position: {x: 10, y: 10}})
		await expect(page.locator("#cm-open")).toHaveText("false")
	})

	// The keyboard ContextMenu key / Shift+F10 fires only `contextmenu` on the focused element (no pointerdown)
	test("a keyboard context menu on another element closes it; on the zone it re-opens there", async ({page}) => {
		await openContextMenu(page)
		await page.locator("#other-zone").evaluate(el => el.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true})))
		await expect(page.locator("#cm-open")).toHaveText("false")
		await openContextMenu(page)
		const zone = (await page.locator("#cm-zone").boundingBox())!
		await page.locator("#cm-zone").evaluate((el, {x, y}) => el.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: x, clientY: y})), {x: zone.x + 250, y: zone.y + 90})
		await expect(page.locator("#cm-open")).toHaveText("true")
		await expect.poll(async () => (await page.locator(".fluent-context-menu").first().boundingBox())?.x).toBeGreaterThan(zone.x + 240)
	})
})
