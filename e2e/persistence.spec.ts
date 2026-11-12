import {test, expect, type Page} from "@playwright/test"

/**
 * Opt-in persistence via `persistKey` (2.0.0, Q20): MultiSplitter and NavGroup only touch
 * localStorage when `persistKey` is set; `id` / `title` are plain DOM attributes.
 * Fixture: docs/src/routes/test/persistence/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/persistence")
	await page.evaluate(() => localStorage.clear())
	await page.reload()
})

const firstPaneWidth = (page: Page, id: string) =>
	page.locator(`#${id} > .fluent-multi-splitter-pane`).first().evaluate(el => Math.round(el.getBoundingClientRect().width))

async function shrinkFirstPane(page: Page, id: string) {
	const gutter = page.locator(`#${id} > .fluent-multi-splitter-gutter`).first()
	await gutter.focus()
	await gutter.press("Home") // first pane → its 100px min
}

test("MultiSplitter id lands on the DOM element", async ({page}) => {
	await expect(page.locator("#split-persisted.fluent-multi-splitter")).toHaveCount(1)
	await expect(page.locator("#split-plain.fluent-multi-splitter")).toHaveCount(1)
})

test("MultiSplitter persists sizes only with persistKey", async ({page}) => {
	expect(await firstPaneWidth(page, "split-persisted")).toBe(200)
	expect(await firstPaneWidth(page, "split-plain")).toBe(200)

	await shrinkFirstPane(page, "split-persisted")
	await shrinkFirstPane(page, "split-plain")
	await expect.poll(() => firstPaneWidth(page, "split-persisted")).toBe(100)
	await expect.poll(() => firstPaneWidth(page, "split-plain")).toBe(100)

	const keys = await page.evaluate(() => Object.keys(localStorage))
	expect(keys).toContain("fluent-multi-splitter:e2e-persisted")
	expect(keys.filter(k => k.startsWith("fluent-multi-splitter:"))).toEqual(["fluent-multi-splitter:e2e-persisted"])

	await page.reload()
	await expect.poll(() => firstPaneWidth(page, "split-persisted")).toBe(100)
	await expect.poll(() => firstPaneWidth(page, "split-plain")).toBe(200)
})

test("NavGroup persists expanded state only with persistKey; title is a plain attribute", async ({page}) => {
	const persisted = page.locator("#group-persisted")
	const plain = page.locator("#group-plain")
	await expect(plain).toHaveAttribute("title", "Plain group tooltip")
	await expect(persisted.getByText("Persisted child")).toBeHidden()
	await expect(plain.getByText("Plain child")).toBeHidden()

	await persisted.getByText("Persisted group").click()
	await plain.getByText("Plain group").click()
	await expect(persisted.getByText("Persisted child")).toBeVisible()
	await expect(plain.getByText("Plain child")).toBeVisible()

	const state = await page.evaluate(() => JSON.parse(localStorage.getItem("svelte-fluentui-nav-state") || "{}"))
	expect(state).toEqual({"e2e-group": true})

	await page.reload()
	await expect(page.locator("#group-persisted").getByText("Persisted child")).toBeVisible()
	await expect(page.locator("#group-plain").getByText("Plain child")).toBeHidden()
})
