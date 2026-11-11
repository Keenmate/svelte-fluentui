import {test, expect} from "@playwright/test"

/**
 * 2.0.0 `...rest` passthrough (native attributes / lowercase DOM events reach the
 * root element) and the new bindables: AccordionItem.expanded,
 * BadgeGroup.showAll, Tooltip.visible.
 * Fixture: docs/src/routes/test/rest-bindables/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/rest-bindables")
})

test("rest attributes and native events reach the root element", async ({page}) => {
	const btn = page.locator("fluent-button[data-testid=btn]")
	await expect(btn).toHaveAttribute("id", "btn-id")
	await btn.focus()
	await page.keyboard.press("a")
	await expect(page.locator("#log")).toContainText("btn-key:a")

	const card = page.locator("[data-testid=card]")
	await expect(card).toHaveAttribute("role", "region")
	await expect(card).toHaveAttribute("aria-label", "Card label")
	await expect(card).toHaveClass(/card/)
	await card.click()
	await expect(page.locator("#log")).toContainText("card-click")

	await expect(page.locator("span[data-testid=badge]")).toHaveAttribute("id", "badge-id")
	await expect(page.locator("div[data-testid=stack]")).toHaveAttribute("id", "stack-id")
	await expect(page.locator("fluent-breadcrumb")).toHaveAttribute("aria-label", "Trail")

	await page.locator("fluent-breadcrumb-item[data-testid=crumb]").click()
	await expect(page.locator("#log")).toContainText("crumb-click")
})

test("AccordionItem: bind:expanded is written by toggles (in an Accordion and standalone)", async ({page}) => {
	await page.locator("#acc-bound").click()
	await expect(page.locator("#acc-state")).toHaveText("true|undefined")
	await page.locator("#acc-standalone").click()
	await expect(page.locator("#acc-state")).toHaveText("true|true")
	await page.locator("#acc-bound").click()
	await expect(page.locator("#acc-state")).toHaveText("false|true")
})

test("BadgeGroup: the expandable toggle writes bind:showAll", async ({page}) => {
	const toggle = page.locator("#group .badge-group-toggle")
	await expect(toggle).toHaveText("+2 more")
	await toggle.click()
	await expect(page.locator("#group-state")).toHaveText("true")
	await expect(toggle).toHaveText("Show less")
	await toggle.click()
	await expect(page.locator("#group-state")).toHaveText("false")
})

test("Tooltip: hover writes bind:visible; assigning it shows/hides", async ({page}) => {
	const tip = page.locator("[data-testid=tip]")
	await page.locator("#tip-anchor").hover()
	await expect(page.locator("#tip-state")).toHaveText("true")
	await expect(tip).toHaveClass(/visible/)
	await page.mouse.move(0, 0)
	await expect(page.locator("#tip-state")).toHaveText("false")
	await page.locator("#tip-toggle").click()
	await expect(page.locator("#tip-state")).toHaveText("true")
	await expect(tip).toHaveClass(/visible/)
})
