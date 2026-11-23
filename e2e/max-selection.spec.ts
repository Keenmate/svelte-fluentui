import {test, expect} from "@playwright/test"

/**
 * `maxSelectionCount` on Select / Combobox `multiple`: at the limit an unselected option can't be
 * picked (click or keyboard, no onChange), deselecting still works, and a status line says so.
 * Fixture: docs/src/routes/test/max-selection/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/max-selection")
})

test("Select: a third pick is refused, deselecting frees a slot", async ({page}) => {
	const list = page.locator("#sel")
	const option = (name: string) => list.getByRole("option", {name})
	await option("Apple").click()
	await option("Banana").click()
	await expect(page.locator("#sel-value")).toHaveText("a,b")
	await expect(page.locator(".select-max-message")).toHaveText("Maximum 2 selections reached")

	await option("Cherry").click()
	await expect(page.locator("#sel-value")).toHaveText("a,b")
	await expect(option("Cherry")).toHaveAttribute("aria-selected", "false")
	await expect(page.locator("#sel-changes")).toHaveText("2")

	// keyboard: Space on the highlighted Cherry row is refused too
	await page.keyboard.press("End")
	await page.keyboard.press("Space")
	await expect(page.locator("#sel-value")).toHaveText("a,b")

	await option("Apple").click()
	await expect(page.locator("#sel-value")).toHaveText("b")
	await expect(page.locator(".select-max-message")).toHaveCount(0)
	await option("Cherry").click()
	await expect(page.locator("#sel-value")).toHaveText("b,c")
})

test("Combobox: reaching the limit closes the dropdown; further picks are refused", async ({page}) => {
	const input = page.locator("#cb")
	const option = (name: string) => page.locator("#cb-listbox").getByRole("option", {name})
	await input.click()
	await option("Apple").click()
	await option("Banana").click()
	await expect(page.locator("#cb-value")).toHaveText("a,b")
	await expect(page.locator("#cb-listbox")).toHaveCount(0)

	await input.click()
	await expect(page.locator(".combobox-max-message")).toHaveText("Maximum 2 selections reached")
	await option("Cherry").click()
	await expect(page.locator("#cb-value")).toHaveText("a,b")
	await expect(page.locator("#cb-changes")).toHaveText("2")

	// keyboard: Enter on Cherry is refused, Enter on Apple deselects it
	await input.press("End")
	await input.press("Enter")
	await expect(page.locator("#cb-value")).toHaveText("a,b")
	await input.press("Home")
	await input.press("Enter")
	await expect(page.locator("#cb-value")).toHaveText("b")
	await expect(page.locator("#cb-changes")).toHaveText("3")
})
