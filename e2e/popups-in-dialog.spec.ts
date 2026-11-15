import {test, expect, type Page} from "@playwright/test"

/**
 * Popups inside a Dialog (`<fluent-dialog>` traps focus to its own subtree): menus and
 * picker popups are portalled into the dialog (actions/portal.ts `portalHost`), so the
 * keyboard can move focus into them — the trap used to pull it straight back, which left
 * MenuButton / ContextMenu mouse-only inside a dialog.
 * Fixture: docs/src/routes/test/popups-in-dialog/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/popups-in-dialog")
	await page.locator("#open-dialog").click()
	await expect(page.locator("#dialog-open")).toHaveText("true")
})

const mbItem = (page: Page, text: string) =>
	page.locator(".fluent-menu-button-menu fluent-menu-item", {hasText: new RegExp(`^\\s*${text}\\s*$`)})
const cmItem = (page: Page, text: string) => page.locator(".fluent-context-menu > button", {hasText: text})
const focusedValue = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.value ?? null)

test("MenuButton: the keyboard moves focus into the menu; Enter runs the item; the dialog stays open", async ({page}) => {
	await page.locator("#dlg-mb").focus()
	await page.keyboard.press("ArrowDown")
	await expect(page.locator("#mb-open")).toHaveText("true")
	await expect(mbItem(page, "Cut")).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(mbItem(page, "Paste")).toBeFocused()
	await page.keyboard.press("Enter")
	await expect(page.locator("#log")).toHaveText("mb:paste")
	await expect(page.locator("#mb-open")).toHaveText("false")
	await expect(page.locator("#dlg-mb")).toBeFocused()
	await expect(page.locator("#dialog-open")).toHaveText("true")
})

test("MenuButton: the menu is positioned under its button", async ({page}) => {
	await page.locator("#dlg-mb").click()
	const button = await page.locator("#dlg-mb").boundingBox()
	const menu = await page.locator(".fluent-menu-button-menu").boundingBox()
	expect(button && menu).toBeTruthy()
	expect(Math.abs(menu!.x - button!.x)).toBeLessThan(2)
	expect(Math.abs(menu!.y - (button!.y + button!.height + 4))).toBeLessThan(2)
})

test("ContextMenu: opening focuses the menu; arrows reach the items; Escape keeps the dialog open", async ({page}) => {
	await page.locator("#dlg-cm-zone").focus()
	await page.locator("#dlg-cm-zone").click({button: "right", position: {x: 20, y: 20}})
	await expect(page.locator("#cm-open")).toHaveText("true")
	await page.keyboard.press("ArrowDown")
	await expect(cmItem(page, "Open")).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(cmItem(page, "Rename")).toBeFocused()
	await page.keyboard.press("Escape")
	await expect(page.locator("#cm-open")).toHaveText("false")
	await expect(page.locator("#dlg-cm-zone")).toBeFocused()
	await expect(page.locator("#dialog-open")).toHaveText("true")
})

test("DatePicker: keyboard open moves focus into the calendar; Enter picks a day", async ({page}) => {
	await page.locator(".fluent-datepicker:has(#dlg-dp) .calendar-button").focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#dp-open")).toHaveText("true")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-10")
	await page.keyboard.press("ArrowRight")
	await expect.poll(() => focusedValue(page)).toBe("2026-05-11")
	await page.keyboard.press("Enter")
	await expect(page.locator("#dp-value")).toHaveText("2026-5-11")
	await expect(page.locator("#dialog-open")).toHaveText("true")
})

test("TimePicker: keyboard open focuses the hour column", async ({page}) => {
	await page.locator(".fluent-timepicker:has(#dlg-tp) .clock-button").focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#tp-open")).toHaveText("true")
	const hours = page.locator(".time-picker-panel").getByRole("radiogroup", {name: "Hour"})
	await expect(hours.locator("[role=radio][aria-checked=true]")).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(hours.locator("[role=radio][aria-checked=true]")).toBeFocused()
	await page.keyboard.press("Escape")
	await expect(page.locator("#tp-open")).toHaveText("false")
	await expect(page.locator("#dialog-open")).toHaveText("true")
})

test("Select: keyboard pick inside the dialog", async ({page}) => {
	await page.locator("#dlg-sel").focus()
	await page.keyboard.press("ArrowDown")
	await page.keyboard.press("ArrowDown")
	await page.keyboard.press("Enter")
	await expect(page.locator("#sel-value")).toHaveText('"b"')
	await expect(page.locator("#dialog-open")).toHaveText("true")
})
