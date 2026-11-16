import {test, expect, type Page} from "@playwright/test"

/**
 * `showClear` on Select, Combobox, Autocomplete, DatePicker and TimePicker (fixture:
 * /test/show-clear). Default true; rendered only with something to clear on an enabled
 * control and, like <fluent-search>, visible only while the field is hovered or focused;
 * empties the value, fires onChange once, keeps focus in the control, list stays closed.
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/show-clear")
})

const section = (page: Page, id: string) => page.locator(`section#${id}`)

test("showClear={false} renders no clear button", async ({page}) => {
	await expect(section(page, "sel-plain").locator(".fluent-field-clear")).toHaveCount(0)
	await expect(section(page, "combo-plain").locator(".fluent-field-clear")).toHaveCount(0)
	await expect(section(page, "ac-plain").locator(".fluent-field-clear")).toHaveCount(0)
})

test("Select: × clears the value, fires onChange, keeps focus, stays closed; hides once empty", async ({page}) => {
	const sec = section(page, "sel")
	const trigger = page.locator("#sel-clear")
	await expect(trigger).toContainText("Alpha")
	await sec.locator(".select-clear").click()
	await expect(trigger).not.toContainText("Alpha")
	await expect(page.locator("#sel-log")).toHaveText('""')
	await expect(trigger).toBeFocused()
	await expect(trigger).toHaveAttribute("aria-expanded", "false")
	await expect(sec.locator(".select-clear")).toHaveCount(0)
})

test("Select: Delete on the focused trigger clears", async ({page}) => {
	const trigger = page.locator("#sel-clear")
	await trigger.focus()
	await page.keyboard.press("Delete")
	await expect(page.locator("#sel-log")).toHaveText('""')
	await expect(trigger).toHaveAttribute("aria-expanded", "false")
})

test("Select: readonly shows no clear and ignores Delete", async ({page}) => {
	await expect(section(page, "sel-readonly").locator(".fluent-field-clear")).toHaveCount(0)
	await page.locator("#sel-ro").focus()
	await page.keyboard.press("Delete")
	await expect(page.locator("#sel-ro")).toContainText("Alpha")
})

test("Combobox single: × empties value and input, keeps focus on the input, list closed", async ({page}) => {
	const input = page.locator("#combo-clear")
	await expect(input).toHaveValue("Charlie")
	const clear = section(page, "combo").locator(".combobox-clear")
	await expect(clear).toHaveAttribute("tabindex", "-1")
	await clear.click()
	await expect(input).toHaveValue("")
	await expect(page.locator("#combo-log")).toHaveText("[]")
	await expect(input).toBeFocused()
	await expect(input).toHaveAttribute("aria-expanded", "false")
	await expect(clear).toHaveCount(0)
})

test("Combobox multiple: × removes every chip", async ({page}) => {
	const sec = section(page, "combo-multi")
	await expect(sec.locator(".fluent-chip")).toHaveCount(2)
	await sec.locator(".combobox-clear").click()
	await expect(sec.locator(".fluent-chip")).toHaveCount(0)
	await expect(page.locator("#combo-multi-value")).toHaveText("[]")
})

test("Autocomplete single: × clears, keeps focus, list closed", async ({page}) => {
	const sec = section(page, "ac")
	const input = sec.locator("input.autocomplete-native-input")
	await expect(input).toHaveValue("Apple")
	await sec.locator(".autocomplete-clear").click()
	await expect(input).toHaveValue("")
	await expect(page.locator("#ac-log")).toHaveText("[]")
	await expect(input).toBeFocused()
	await expect(page.locator(".options-listbox")).toHaveCount(0)
})

test("Autocomplete multi: × removes every chip", async ({page}) => {
	const sec = section(page, "ac-multi")
	await sec.locator(".autocomplete-clear").click()
	await expect(page.locator("#ac-multi-value")).toHaveText("[]")
})

test("default is on; the × is transparent until the field is hovered or focused", async ({page}) => {
	const clear = section(page, "sel-default").locator(".fluent-field-clear")
	await expect(clear).toHaveCount(1)
	await page.locator("#outside").focus()
	await page.mouse.move(0, 0)
	await expect(clear).toHaveCSS("opacity", "0")
	await page.locator("#sel-def").hover()
	await expect(clear).toHaveCSS("opacity", "1")
	await page.mouse.move(0, 0)
	await expect(clear).toHaveCSS("opacity", "0")
	await page.locator("#sel-def").focus()
	await expect(clear).toHaveCSS("opacity", "1")
})

test("Combobox: typed filter text alone counts as something to clear", async ({page}) => {
	const sec = section(page, "combo-empty")
	const input = page.locator("#combo-typed")
	await expect(sec.locator(".combobox-clear")).toHaveCount(0)
	await input.fill("Cha")
	await sec.locator(".combobox-clear").click()
	await expect(input).toHaveValue("")
	await expect(sec.locator(".combobox-clear")).toHaveCount(0)
})

test("DatePicker: × clears without opening; not a Tab stop", async ({page}) => {
	const sec = section(page, "dp")
	const clear = sec.locator(".clear-button")
	await expect(clear).toHaveAttribute("tabindex", "-1")
	await clear.click()
	await expect(page.locator("#dp-value")).toHaveText("null")
	await expect(page.locator(".fluent-calendar")).toHaveCount(0)
})

test("DatePicker / TimePicker: Delete on the focused field clears", async ({page}) => {
	await page.locator("#dp-clear").focus()
	await page.keyboard.press("Delete")
	await expect(page.locator("#dp-value")).toHaveText("null")
	await page.locator("#tp-clear").focus()
	await page.keyboard.press("Backspace")
	await expect(page.locator("#tp-value")).toHaveText("null")
})

test("TimePicker: × clears", async ({page}) => {
	await section(page, "tp").locator(".clear-button").click()
	await expect(page.locator("#tp-value")).toHaveText("null")
	await expect(page.locator(".time-picker-panel")).toHaveCount(0)
})
