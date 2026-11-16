import {test, expect, type Page} from "@playwright/test"

/**
 * `showClear` on Select, Combobox and Autocomplete (fixture: /test/show-clear).
 * Opt-in (default false); shown only with a value on an enabled control; empties the
 * value, fires onChange once, keeps focus in the control and leaves the list closed.
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/show-clear")
})

const section = (page: Page, id: string) => page.locator(`section#${id}`)

test("no clear button without showClear (default false)", async ({page}) => {
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
