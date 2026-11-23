import {test, expect, type Page} from "@playwright/test"

/**
 * `<Radio checked>` and `<AccordionItem expanded>` seed the parent's value on its first render (a given
 * value wins); afterwards the RadioGroup / Accordion decides, and `bind:expanded` mirrors it.
 * Fixture: docs/src/routes/test/initial-state/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/initial-state")
})

const radios = (page: Page, group: string) =>
	page
		.locator(`#${group} fluent-radio`)
		.evaluateAll((els) => els.map((r) => !!(r as HTMLElement & {checked: boolean}).checked))
const expandedItems = (page: Page, acc: string) =>
	page
		.locator(`#${acc} .fluent-accordion-item`)
		.evaluateAll((els) => els.map((el) => el.classList.contains("expanded")))

test("Radio checked: seeds the group value and is checked; another pick replaces it", async ({page}) => {
	await expect(page.locator("#rv")).toHaveText("a")
	await expect.poll(() => radios(page, "rg")).toEqual([true, false])
	await page.locator("#rg fluent-radio").nth(1).click()
	await expect(page.locator("#rv")).toHaveText("b")
	await expect.poll(() => radios(page, "rg")).toEqual([false, true])
})

test("Radio checked: a given group value wins", async ({page}) => {
	await expect(page.locator("#rg-given-value")).toHaveText("b")
	await expect.poll(() => radios(page, "rg-given")).toEqual([false, true])
})

test("AccordionItem expanded: seeds the value, single mode stays single, bind:expanded mirrors", async ({page}) => {
	await expect(page.locator("#av")).toHaveText('"i1"')
	await expect.poll(() => expandedItems(page, "acc")).toEqual([true, false])

	await page.locator("button#i2").click()
	await expect(page.locator("#av")).toHaveText('"i2"')
	await expect.poll(() => expandedItems(page, "acc")).toEqual([false, true])
	await expect(page.locator("#two-expanded")).toHaveText("true")

	await page.locator("button#i1").click()
	await expect(page.locator("#av")).toHaveText('"i1"')
	await expect.poll(() => expandedItems(page, "acc")).toEqual([true, false])
	await expect(page.locator("#two-expanded")).toHaveText("false")

	await page.locator("button#i1").click()
	await expect(page.locator("#av")).toHaveText("null")
	await expect.poll(() => expandedItems(page, "acc")).toEqual([false, false])
})

test("AccordionItem: assigning bind:expanded from code opens the item through the Accordion", async ({page}) => {
	await page.locator("#open-two").click()
	await expect(page.locator("#av")).toHaveText('"i2"')
	await expect.poll(() => expandedItems(page, "acc")).toEqual([false, true])
})

test("Accordion multiple: every expanded item seeds the value", async ({page}) => {
	await expect(page.locator("#a-multi")).toHaveText('["m1","m2"]')
	await page.locator("button#m1").click()
	await expect(page.locator("#a-multi")).toHaveText('["m2"]')
	await expect.poll(() => expandedItems(page, "acc-multi")).toEqual([false, true, false])
})
