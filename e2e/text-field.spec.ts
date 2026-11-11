import {test, expect} from "@playwright/test"

/**
 * TextField / NumberField / Search (2.0.0): native events reach the host via
 * `...rest`, component events are onChange({value}) / onSearch({term}).
 * Fixture: docs/src/routes/test/text-field/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/text-field")
})

test("TextField: rest props and native events reach fluent-text-field", async ({page}) => {
	const host = page.locator("[data-testid=tf-host]")
	await expect(host).toHaveClass(/custom-class/)
	await host.locator("input").focus()
	await page.keyboard.type("ab")
	await expect(page.locator("#tf-value")).toHaveText("ab")
	await expect(page.locator("#tf-log")).toContainText("focus")
	await expect(page.locator("#tf-log")).toContainText("key:a")
})

test("TextField: onChange fires with {value} on commit", async ({page}) => {
	await page.locator("[data-testid=tf-host] input").fill("hello")
	await page.keyboard.press("Tab")
	await expect(page.locator("#tf-log")).toContainText("change:hello")
})

test("NumberField: onChange fires with {value}", async ({page}) => {
	await page.locator("#nf-input input").fill("42")
	await page.keyboard.press("Tab")
	await expect(page.locator("#tf-log")).toContainText("num:42")
})

test("Search: onSearch fires with {term}", async ({page}) => {
	await page.locator("#search-input input").fill("xyz")
	await expect(page.locator("#search-terms")).toContainText("xyz")
})
