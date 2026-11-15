import {test, expect} from "@playwright/test"

/**
 * MenuButton / ContextMenu on the shared action-item model (2.0.0): MenuEntry items,
 * divider entries, onAction + beforeActionCallback, submenus, expandable sections.
 * Fixture: docs/src/routes/test/menus/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/menus")
})

test("MenuButton: dividers collapse, hidden items drop, click runs onClick then onAction", async ({page}) => {
	await page.locator("fluent-button", {hasText: "Actions"}).click()
	const menu = page.locator(".fluent-menu-button-menu")
	await expect(menu.locator("fluent-menu-item")).toHaveCount(3)
	await expect(menu.locator("fluent-divider")).toHaveCount(1)
	await menu.locator("fluent-menu-item", {hasText: "Edit"}).click()
	await expect(page.locator("#log")).toHaveText("click:edit | action:custom:edit")
})

test("MenuButton: beforeActionCallback false cancels; disabled items don't run", async ({page}) => {
	await page.locator("#toggle-veto").click()
	await page.locator("fluent-button", {hasText: "Actions"}).click()
	await page.locator(".fluent-menu-button-menu fluent-menu-item", {hasText: "Edit"}).click()
	await expect(page.locator("#log")).toHaveText("")
	await page.locator("#toggle-veto").click()
	await page.locator("fluent-button", {hasText: "Actions"}).click()
	await page.locator(".fluent-menu-button-menu fluent-menu-item", {hasText: "Off"}).click({force: true})
	await expect(page.locator("#log")).not.toContainText("click:off")
})

test("ContextMenu: leaf, submenu and expandable section", async ({page}) => {
	await page.locator("#cm-zone").click({button: "right"})
	await page.locator(".fluent-context-menu button", {hasText: "Open"}).click()
	await expect(page.locator("#log")).toHaveText("cm:open | cm-action:open:true")

	await page.locator("#cm-zone").click({button: "right"})
	await page.locator(".fluent-context-menu button", {hasText: "New"}).hover()
	await page.locator(".fluent-context-submenu button", {hasText: "Document"}).click()
	await expect(page.locator("#log")).toContainText("cm:doc | cm-action:doc:true")

	await page.locator("#cm-zone").click({button: "right"})
	await expect(page.locator(".fluent-context-menu button", {hasText: "Inner"})).toHaveCount(0)
	await page.locator(".fluent-context-menu button", {hasText: "Section"}).click()
	await page.locator(".fluent-context-menu button", {hasText: "Inner"}).click()
	await expect(page.locator("#log")).toContainText("cm:inner | cm-action:inner:true")
})

test("MenuButton: a danger item is painted in the danger colour (shared primitive)", async ({page}) => {
	await page.locator("fluent-button", {hasText: "Actions"}).click()
	const item = page.locator(".fluent-menu-button-menu fluent-menu-item", {hasText: "Delete"})
	const color = await item.evaluate(el => getComputedStyle(el).color)
	const expected = await item.evaluate(el => {
		const probe = document.createElement("span")
		probe.style.color = "var(--fluent-color-danger-foreground, #d13438)"
		el.parentElement!.append(probe)
		const c = getComputedStyle(probe).color
		probe.remove()
		return c
	})
	expect(color).toBe(expected)
})
