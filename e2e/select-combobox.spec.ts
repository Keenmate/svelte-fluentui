import {test, expect} from "@playwright/test"

/**
 * Select / Combobox component events (2.0.0: onChange({value, option}),
 * onSearch({term}), filterCallback({term, option})).
 * Fixture: docs/src/routes/test/select-combobox/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/select-combobox")
})

test("Select single: onChange carries value and option; re-picking the same option is silent", async ({page}) => {
	await page.locator("#sel-single").click()
	await page.getByRole("option", {name: "Bravo"}).click()
	await expect(page.locator("#select-single-log")).toHaveText('"b":Bravo')
	await page.locator("#sel-single").click()
	await page.getByRole("option", {name: "Bravo"}).click()
	await expect(page.locator("#select-single-log")).toHaveText('"b":Bravo')
})

test("Select multiple: onChange carries the array", async ({page}) => {
	const wrap = page.locator("#select-multi")
	await wrap.getByRole("option", {name: "Xray"}).click()
	await wrap.getByRole("option", {name: "Yankee"}).click()
	await expect(page.locator("#select-multi-log")).toHaveText('["x"] | ["x","y"]')
})

test("Combobox: onChange carries an array; filterCallback gets {term, option}", async ({page}) => {
	const input = page.locator("#combo-input")
	await input.click()
	await input.fill("ch")
	await expect(page.locator("#combo-filtered")).toHaveText("called")
	await expect(page.getByRole("option", {name: "Delta"})).toBeHidden()
	await page.getByRole("option", {name: "Charlie"}).click()
	await expect(page.locator("#combo-log")).toHaveText('["c1"]')
})

test("Combobox: rest props reach the root; bind:currentValue mirrors the input text", async ({page}) => {
	await expect(page.locator("[data-testid=combo-root]")).toHaveCount(1)
	const input = page.locator("#combo-input")
	await input.click()
	await input.fill("ch")
	await expect(page.locator("#combo-current")).toHaveText("ch")
	await page.getByRole("option", {name: "Charlie"}).click()
	await expect(page.locator("#combo-current")).toHaveText("Charlie")
})

test("Combobox: onSearch fires with {term}", async ({page}) => {
	const input = page.locator("#search-input")
	await input.click()
	await input.fill("abc")
	await expect(page.locator("#search-terms")).toContainText("abc")
})

test("Select: onOpenChange fires on user and programmatic open/close", async ({page}) => {
	const log = page.locator("#sel-open-log")
	await page.locator("#sel-open").click()
	await expect(page.getByRole("option", {name: "Echo"})).toBeVisible()
	await expect(log).toHaveText("true")
	await page.keyboard.press("Escape")
	await expect(log).toHaveText("true,false")
	await page.locator("#sel-open-set").click()
	await expect(log).toHaveText("true,false,true")
	await page.locator("#sel-close-set").click()
	await expect(log).toHaveText("true,false,true,false")
})

test("Combobox: onOpenChange fires on user and programmatic open/close", async ({page}) => {
	const log = page.locator("#combo-open-log")
	const input = page.locator("#combo-open-input")
	await input.click()
	await input.press("ArrowDown")
	await expect(page.getByRole("option", {name: "Golf"})).toBeVisible()
	await expect(log).toHaveText("true")
	await input.press("Escape")
	await expect(log).toHaveText("true,false")
	await page.locator("#combo-open-set").click()
	await expect(log).toHaveText("true,false,true")
	await page.locator("#combo-close-set").click()
	await expect(log).toHaveText("true,false,true,false")
})

test("Combobox: height is applied to the control", async ({page}) => {
	const control = page.locator("#combo-open .combobox-control")
	await expect(control).toHaveCSS("height", "48px")
})

// helpers/listbox-nav + helpers/text (2.0.0 Phase 3)
test("Select keyboard: arrows/Home/End skip disabled options; type-ahead jumps; Enter picks", async ({page}) => {
	const trigger = page.locator("#sel-keys")
	await trigger.focus()
	await page.keyboard.press("ArrowDown") // opens on the first enabled option
	const hl = page.locator(".select-listbox-popover .fluent-option[data-highlighted]")
	await expect(hl).toHaveText("Alpha")
	await page.keyboard.press("ArrowDown")
	await expect(hl).toHaveText("Charlie") // Bravo is disabled
	await page.keyboard.press("End")
	await expect(hl).toHaveText("Delta") // Echo is disabled
	await page.keyboard.press("Home")
	await expect(hl).toHaveText("Alpha")
	await page.keyboard.press("a")
	await expect(hl).toHaveText("Charlie")
	await page.keyboard.press("Enter")
	await expect(page.locator(".select-listbox-popover")).toHaveCount(0)
	await expect(trigger).toHaveText("Charlie")
})

test("Combobox keyboard: diacritic-insensitive filter; arrows walk visible, enabled options only", async ({page}) => {
	const input = page.locator("#combo-keys")
	await input.click()
	await input.pressSequentially("zl")
	const list = page.locator(".combobox-listbox")
	await expect(list.locator(".fluent-option:not([data-filtered-out])")).toHaveCount(3)
	const hl = list.locator(".fluent-option[data-highlighted]")
	await expect(hl).toHaveText("Žluťoučký kůň")
	await page.keyboard.press("End")
	await expect(hl).toHaveText("Zlatý") // Zlobivý is disabled, Other filtered out
	await page.keyboard.press("ArrowDown")
	await expect(hl).toHaveText("Zlatý") // clamped at the end
	await page.keyboard.press("Home")
	await expect(hl).toHaveText("Žluťoučký kůň")
	await page.keyboard.press("Enter")
	await expect(input).toHaveValue("Žluťoučký kůň")
})

test("Combobox searchBehavior: normalized ignores accents, case-insensitive and exact do not", async ({page}) => {
	// The listbox is portalled — reach it through the input's aria-controls.
	const expectZurich = async (id: string, term: string, shown: boolean) => {
		const input = page.locator(`#${id}`)
		await input.click()
		await input.fill(term)
		const listId = await input.getAttribute("aria-controls")
		const option = page.locator(`[id="${listId}"]`).getByRole("option", {name: "Zürich"})
		if (shown) await expect(option).toBeVisible()
		else await expect(option).toBeHidden()
		await page.keyboard.press("Escape")
	}
	await expectZurich("sb-normalized", "zurich", true)
	await expectZurich("sb-case", "zurich", false)
	await expectZurich("sb-case", "ZÜRICH", true)
	await expectZurich("sb-exact", "zürich", false)
	await expectZurich("sb-exact", "Zürich", true)
})

test("Select type-ahead: with nothing selected the first letter lands on the first match", async ({page}) => {
	const trigger = page.locator("#sb-select")
	await trigger.focus()
	await page.keyboard.press("a")
	await page.keyboard.press("Enter")
	await expect(trigger).toContainText("Amsterdam")
})

test("Select type-ahead: a plain letter steps on to an accented label by default", async ({page}) => {
	const trigger = page.locator("#sb-select")
	await trigger.focus()
	await page.keyboard.press("a")
	await page.keyboard.press("Enter")
	await expect(trigger).toContainText("Amsterdam")
	// Closed with Amsterdam selected: pressing a again moves to the next a… label, Ávila
	await page.keyboard.press("a")
	await page.keyboard.press("Enter")
	await expect(trigger).toContainText("Ávila")
})
