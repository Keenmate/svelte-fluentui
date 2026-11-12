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

test("NumberField: bind:value is a number, null when cleared", async ({page}) => {
	const input = page.locator("#nf-input input")
	const out = page.locator("#nf-value")
	await expect(out).toHaveText("null")
	await input.fill("42.5")
	await expect(out).toHaveText("number:42.5")
	await page.keyboard.press("Tab")
	await expect(page.locator("#tf-log")).toContainText("num:42.5")
	await input.fill("")
	await expect(out).toHaveText("null")
	await page.keyboard.press("Tab")
	await expect(page.locator("#tf-log")).toContainText("num:null")
})

test("NumberField: partial input does not clobber typing", async ({page}) => {
	const input = page.locator("#nf-input input")
	const out = page.locator("#nf-value")
	await input.click()
	await page.keyboard.type("-")
	await expect(out).toHaveText("null")
	await expect(input).toHaveValue("-")
	await page.keyboard.type("1.")
	await expect(out).toHaveText("number:-1")
	await expect(input).toHaveValue("-1.")
	await page.keyboard.type("5")
	await expect(out).toHaveText("number:-1.5")
	await expect(input).toHaveValue("-1.5")
})

test("NumberField: programmatic value reaches the element", async ({page}) => {
	const input = page.locator("#nf-input input")
	await page.locator("#nf-set").click()
	await expect(input).toHaveValue("7")
	await expect(page.locator("#nf-value")).toHaveText("number:7")
	await page.locator("#nf-clear").click()
	await expect(input).toHaveValue("")
	await expect(page.locator("#nf-value")).toHaveText("null")
	await expect(page.locator("#tf-log")).not.toContainText("num:")
})

test("Search: onSearch fires with {term}", async ({page}) => {
	await page.locator("#search-input input").fill("xyz")
	await expect(page.locator("#search-terms")).toContainText("xyz")
})
