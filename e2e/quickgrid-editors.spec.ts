import {test, expect} from "@playwright/test"

/**
 * QuickGrid dropdown editors reuse the library's Select (select) and Combobox (combobox,
 * autocomplete): option groups, multi-letter type-ahead, list keys, typed values through
 * the value ↔ key layer, the grid keeping its keys in navigate mode. (`.highlighted` in the
 * highlight selectors is the pre-reuse editor's row class, kept so the specs ran against it.)
 * Fixture: docs/src/routes/test/quickgrid-editors/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/quickgrid-editors")
})

test("select editor: `group` on the options renders option groups; a numeric value commits as a number", async ({page}) => {
	const wrap = page.locator("#groups-wrap")
	await wrap.locator("td", {hasText: "Apple"}).dblclick()
	await page.keyboard.press("Enter")
	const list = page.locator(".cell-dropdown")
	await expect(list.getByRole("group", {name: "Fruit"}).getByRole("option")).toHaveText(["Apple", "Banana"])
	await expect(list.getByRole("group", {name: "Vegetable"}).getByRole("option")).toHaveText(["Carrot", "Leek"])
	await list.getByRole("option", {name: "Leek"}).click()
	await expect(page.locator("#groups-log")).toHaveText("pick:4")
	await expect(wrap.locator("tbody td").nth(1)).toHaveText("Leek")
})

test("combobox editor: option groups, filtered by group", async ({page}) => {
	const wrap = page.locator("#groups-wrap")
	await wrap.locator("td", {hasText: "Carrot"}).dblclick()
	const list = page.locator(".cell-dropdown")
	await expect(list.getByRole("group")).toHaveCount(2)
	await page.keyboard.type("eek")
	await expect(list.getByRole("group", {name: "Fruit"})).toBeHidden()
	await expect(list.getByRole("group", {name: "Vegetable"}).getByRole("option")).toHaveText(["Leek"])
	await page.keyboard.press("Enter")
	await expect(page.locator("#groups-log")).toHaveText("combo:4")
})

test("select editor: type-ahead takes a multi-letter prefix", async ({page}) => {
	const wrap = page.locator("#typeahead-wrap")
	await wrap.locator("td", {hasText: "cherry"}).dblclick()
	await page.keyboard.type("bl")
	await expect(page.locator('.cell-dropdown [role="option"]:is([data-highlighted], .highlighted)')).toHaveText("Blueberry")
})

test("select editor: Home / End move through the open list", async ({page}) => {
	const wrap = page.locator("#typeahead-wrap")
	await wrap.locator("td", {hasText: "cherry"}).dblclick()
	await page.keyboard.press("Enter")
	const highlighted = page.locator('.cell-dropdown [role="option"]:is([data-highlighted], .highlighted)')
	await expect(highlighted).toHaveText("Cherry")
	await page.keyboard.press("End")
	await expect(highlighted).toHaveText("Zucchini")
	await page.keyboard.press("Home")
	await expect(highlighted).toHaveText("Banana")
})

test("navigate mode: arrows move in an open list, a closed list hands them to the grid", async ({page}) => {
	const wrap = page.locator("#nav-wrap")
	const log = page.locator("#nav-log")
	const fruit = (row: number) => wrap.locator("tbody tr").nth(row).locator("td").nth(1)
	// Focusing a dropdown cell starts its edit (dropdownShowOnFocus); the list is closed
	await fruit(0).click()
	await expect(fruit(0).locator(".cell-select-trigger")).toBeFocused()
	await page.keyboard.press("Enter")
	const highlighted = page.locator('.cell-dropdown [role="option"]:is([data-highlighted], .highlighted)')
	await expect(highlighted).toHaveText("Banana")
	await page.keyboard.press("ArrowDown")
	await expect(highlighted).toHaveText("Blueberry")
	await page.keyboard.press("Enter")
	await expect(log).toHaveText(`1.fruit:"blueberry"`)
	await expect(fruit(0)).toHaveText("blueberry")
	await expect(fruit(0)).toBeFocused()
	// Closed list: ArrowDown leaves the cell for the row below (no commit — nothing changed)
	await page.keyboard.press("Enter")  // edit
	await expect(fruit(0).locator(".cell-select-trigger")).toBeFocused()
	await page.keyboard.press("Enter")  // open
	await expect(page.locator(".cell-dropdown")).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.locator(".cell-dropdown")).toHaveCount(0)
	await expect(fruit(0).locator(".cell-select-trigger")).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(fruit(1).locator(".cell-select-trigger")).toBeFocused()
	await expect(log).toHaveText(`1.fruit:"blueberry"`)
})

test("navigate mode: a dblclick on a dropdown cell (restarting its edit) keeps the editor working", async ({page}) => {
	const errors: string[] = []
	page.on("pageerror", (error) => errors.push(error.message))
	const wrap = page.locator("#nav-wrap")
	const city = wrap.locator("tbody tr").first().locator("td").nth(2)
	await city.dblclick()
	const input = city.locator("input")
	await expect(input).toBeFocused()
	await expect(input).toHaveValue("Prague")
	await page.keyboard.type("Ost")
	await page.keyboard.press("Enter")
	await expect(page.locator("#nav-log")).toHaveText(`1.city:"ost"`)
	expect(errors).toEqual([])
})

test("combobox editor: a value no option has shows the cell's text", async ({page}) => {
	const wrap = page.locator("#missing-wrap")
	await wrap.locator("td", {hasText: "Zlín"}).dblclick()
	await expect(wrap.locator("td.editing input")).toHaveValue("Zlín")
})

test("autocomplete editor: Escape on the open list reverts the typed text; free text commits on Enter", async ({page}) => {
	const wrap = page.locator("#ac-wrap")
	const log = page.locator("#ac-log")
	const cell = wrap.locator("tbody td").nth(1)
	await cell.dblclick()
	const input = cell.locator("input")
	await expect(input).toHaveValue("Prague")
	await page.keyboard.type("Narn")
	await expect(page.locator(".cell-dropdown")).toContainText("No options")
	await page.keyboard.press("Escape")
	await expect(page.locator(".cell-dropdown")).toHaveCount(0)
	await expect(input).toHaveValue("Prague")
	await page.locator("#ac-outside").click()
	await expect(log).toHaveText("cancel:city")
	await cell.dblclick()
	await page.keyboard.type("Narnia")
	await expect(page.locator(".cell-dropdown")).toContainText("No options")
	await page.keyboard.press("Enter")
	await expect(log).toHaveText(`cancel:city | city:"Narnia"`)
	await expect(cell).toHaveText("Narnia")
})
