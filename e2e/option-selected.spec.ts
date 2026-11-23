import {test, expect} from "@playwright/test"

/**
 * `<Option selected>` works like a native `<option selected>`: it seeds the parent's selection (and the
 * bound value) on the first render, a given `value` wins, and afterwards the row follows the selection,
 * so it can be deselected.
 * Fixture: docs/src/routes/test/option-selected/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/option-selected")
})

test("Select multiple: preselected rows are in the value and can be deselected", async ({page}) => {
	await expect(page.locator("#multi-value")).toHaveText("a,b")
	const apple = page.locator("#multi").getByRole("option", {name: "Apple"})
	await expect(apple).toHaveAttribute("aria-selected", "true")
	await apple.click()
	await expect(apple).toHaveAttribute("aria-selected", "false")
	await expect(page.locator("#multi-value")).toHaveText("b")
})

test("Select single: preselected value shows; a reopened dropdown doesn't re-apply it", async ({page}) => {
	await expect(page.locator("#single-value")).toHaveText("b")
	await expect(page.locator("#single")).toContainText("Banana")
	await page.locator("#single").click()
	await page.locator("#single-listbox").getByRole("option", {name: "Cherry"}).click()
	await expect(page.locator("#single-value")).toHaveText("c")
	await page.locator("#single").click()
	await expect(page.locator("#single-listbox").getByRole("option", {name: "Cherry"})).toHaveAttribute(
		"aria-selected",
		"true"
	)
	await expect(page.locator("#single-value")).toHaveText("c")
})

test("a given value wins over <Option selected>", async ({page}) => {
	await expect(page.locator("#given-value")).toHaveText("c")
	await expect(page.locator("#given").getByRole("option", {name: "Apple"})).toHaveAttribute("aria-selected", "false")
})

test("Combobox and Listbox take the preselection too", async ({page}) => {
	await expect(page.locator("#cb-value")).toHaveText("a")
	await expect(page.locator("#lb-value")).toHaveText("b")
	const banana = page.locator("#lb").getByRole("option", {name: "Banana"})
	await banana.click()
	await expect(page.locator("#lb-value")).toHaveText("")
})
