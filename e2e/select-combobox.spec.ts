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
