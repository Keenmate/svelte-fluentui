import {test, expect} from "@playwright/test"

/**
 * Misc a11y (2.0.0 Phase 3): Tooltip describedby / focus / Escape through the
 * layer stack, clickable badges & labels as buttons, NavMenu rows by keyboard,
 * Delete-to-close tabs, Paginator landmark, CommandPalette combobox wiring,
 * Accordion headers (non-regression).
 * Fixture: docs/src/routes/test/a11y-misc/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/a11y-misc")
})

test("Tooltip: shows on keyboard focus and describes its anchor while shown", async ({page}) => {
	const anchor = page.locator("#tip-anchor")
	await anchor.focus()
	const tooltip = page.locator(".fluent-tooltip.visible", {hasText: "Save the document"})
	await expect(tooltip).toBeVisible()
	const id = await tooltip.getAttribute("id")
	expect(id).toBeTruthy()
	await expect(anchor).toHaveAttribute("aria-describedby", id!)
	await expect(anchor).toHaveAccessibleDescription("Save the document")

	await page.keyboard.press("Escape")
	await expect(tooltip).toHaveCount(0)
	await expect(anchor).not.toHaveAttribute("aria-describedby")
	await expect(anchor).toBeFocused()
})

test("Tooltip: Escape inside a dialog hides the tooltip first, the dialog stays open", async ({page}) => {
	await page.locator("#open-dialog").click()
	await expect(page.locator("#dialog-open")).toHaveText("true")
	await page.locator("#dialog-tip-anchor").focus()
	const tooltip = page.locator(".fluent-tooltip.visible", {hasText: "Hint inside the dialog"})
	await expect(tooltip).toBeVisible()

	await page.keyboard.press("Escape")
	await expect(tooltip).toHaveCount(0)
	await expect(page.locator("#dialog-open")).toHaveText("true")

	await page.keyboard.press("Escape")
	await expect(page.locator("#dialog-open")).toHaveText("false")
})

test("Badge / Label / CompositeBadge with a click handler are keyboard buttons", async ({page}) => {
	const badge = page.locator("#badges").getByRole("button", {name: "Clickable badge"})
	await expect(badge).toHaveAttribute("tabindex", "0")
	await badge.focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#log")).toHaveText("badge")

	const label = page.locator("#badges").getByRole("button", {name: "Clickable label"})
	await label.focus()
	await page.keyboard.press(" ")
	await expect(page.locator("#log")).toHaveText("badge | label")

	const composite = page.locator("#badges").getByRole("button", {name: "Composite"})
	await composite.focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#log")).toHaveText("badge | label | composite")

	// Without a handler a badge stays a plain, non-focusable span.
	await expect(page.locator("#badges .fluent-badge, #badges span", {hasText: "Static badge"}).first()).not.toHaveAttribute("role", "button")
})

test("NavMenu: Enter on a group row toggles it, Enter on a link row activates it", async ({page}) => {
	const group = page.locator("#nav-group")
	await group.focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#group-expanded")).toHaveText("true")

	const child = page.locator("#nav-group [role=menuitem]", {hasText: "Child"})
	await child.focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("#log")).toHaveText("nav-child")
})

test("Tabs: Delete on a closable tab closes it (keyboard path to the × control)", async ({page}) => {
	const tab = page.getByRole("tab", {name: "Tab a"})
	await expect(tab).toHaveAttribute("aria-keyshortcuts", "Delete")
	await tab.focus()
	await page.keyboard.press("Delete")
	await expect(page.locator("#log")).toHaveText("close:a")
	await expect(page.getByRole("tab", {name: "Tab a"})).toHaveCount(0)
})

test("Paginator: a named navigation landmark with a live page status", async ({page}) => {
	const nav = page.getByRole("navigation", {name: "Pagination"})
	await expect(nav).toBeVisible()
	await expect(nav.locator(".pagination-text")).toHaveAttribute("aria-live", "polite")
	await nav.getByRole("button", {name: "Go to next page"}).click()
	await expect(page.locator("#page-index")).toHaveText("1")
})

test("CommandPalette: input is a combobox, rows are grouped options, focus returns to the trigger", async ({page}) => {
	const trigger = page.locator("#palette-trigger")
	await trigger.click()
	const input = page.locator(".cp-input")
	await expect(input).toBeFocused()
	await expect(input).toHaveAttribute("role", "combobox")
	const listbox = page.locator(`[id="${await input.getAttribute("aria-controls")}"]`)
	await expect(listbox).toHaveAttribute("role", "listbox")
	await expect(listbox.locator("[role=group]")).toHaveCount(2)
	await expect(listbox.locator("[role=group]").first()).toHaveAttribute("aria-label", "Files")

	let active = page.locator(`[id="${await input.getAttribute("aria-activedescendant")}"]`)
	await expect(active).toHaveText(/New document/)
	await expect(active).toHaveAttribute("aria-selected", "true")
	await page.keyboard.press("ArrowDown")
	active = page.locator(`[id="${await input.getAttribute("aria-activedescendant")}"]`)
	await expect(active).toHaveText(/Open document/)

	// aria-modal: Tab stays inside the palette.
	await page.keyboard.press("Tab")
	await expect(page.locator(".cp-panel")).toContainText("New document")
	expect(await page.evaluate(() => !!document.activeElement?.closest(".cp-panel"))).toBe(true)

	await page.keyboard.press("Escape")
	await expect(page.locator(".cp-panel")).toHaveCount(0)
	await expect(trigger).toBeFocused()
})

test("Accordion: headers are buttons wired to labelled regions", async ({page}) => {
	const header = page.getByRole("button", {name: "One"})
	await expect(header).toHaveAttribute("aria-expanded", "false")
	await header.focus()
	await page.keyboard.press("Enter")
	await expect(header).toHaveAttribute("aria-expanded", "true")
	await expect(page.getByRole("region", {name: "One"})).toContainText("Body one")
	await page.keyboard.press("ArrowDown")
	await expect(page.getByRole("button", {name: "Two"})).toBeFocused()
})
