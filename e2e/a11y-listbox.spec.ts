import {test, expect, type Locator} from "@playwright/test"

/**
 * Listbox ARIA (2.0.0 Phase 3 a11y pass), APG combobox patterns: Select (select-only),
 * Combobox / Autocomplete (editable). Focus stays on the trigger / input and
 * `aria-activedescendant` names the highlighted option; option ids are unique.
 * Fixture: docs/src/routes/test/a11y-listbox/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/a11y-listbox")
})

/** The element `aria-activedescendant` on `owner` points at. */
async function activeDescendant(owner: Locator) {
	const id = await owner.getAttribute("aria-activedescendant")
	expect(id, "aria-activedescendant set").toBeTruthy()
	return owner.page().locator(`[id="${id}"]`)
}

test("Select: trigger wires aria-controls / aria-activedescendant without a consumer id", async ({page}) => {
	const trigger = page.locator("#select-single [role=combobox]")
	await expect(trigger).toHaveAttribute("aria-expanded", "false")
	await expect(trigger).toHaveAttribute("aria-required", "true")
	// The label names the trigger through for/id.
	await expect(page.getByLabel("Fruit", {exact: false}).first()).toHaveAttribute("role", "combobox")

	await trigger.focus()
	await page.keyboard.press("ArrowDown")
	await expect(trigger).toHaveAttribute("aria-expanded", "true")
	const listboxId = await trigger.getAttribute("aria-controls")
	expect(listboxId).toBeTruthy()
	await expect(page.locator(`[id="${listboxId}"]`)).toHaveAttribute("role", "listbox")

	await page.keyboard.press("ArrowDown")
	const active = await activeDescendant(trigger)
	await expect(active).toHaveAttribute("role", "option")
	await expect(active).toHaveText("Banana")
	await expect(active).toHaveAttribute("data-highlighted", "")
	await expect(trigger).toBeFocused()

	await page.keyboard.press("Enter")
	await expect(page.locator("#fruit")).toHaveText("banana")
	await expect(trigger).not.toHaveAttribute("aria-activedescendant")
})

test("option ids are present and unique across every listbox", async ({page}) => {
	await page.locator("#select-single [role=combobox]").click()
	const ids = await page.locator(".fluent-option").evaluateAll(els => els.map(el => el.id))
	expect(ids.length).toBeGreaterThan(6)
	expect(ids.every(Boolean)).toBe(true)
	expect(new Set(ids).size).toBe(ids.length)
})

test("Select multiple: the inline listbox is keyboard operable (arrows + Space)", async ({page}) => {
	const list = page.locator("#select-multi [role=listbox]")
	await expect(list).toHaveAttribute("aria-multiselectable", "true")
	await list.focus()
	let active = await activeDescendant(list)
	await expect(active).toHaveText("Red")
	await page.keyboard.press("ArrowDown")
	active = await activeDescendant(list)
	await expect(active).toHaveText("Green")
	await page.keyboard.press(" ")
	await expect(page.locator("#colors")).toHaveText("green")
	await expect(active).toHaveAttribute("aria-selected", "true")
	await page.keyboard.press("End")
	await page.keyboard.press("Enter")
	await expect(page.locator("#colors")).toHaveText("green,blue")
})

test("Combobox: aria-activedescendant follows the cursor; required is exposed", async ({page}) => {
	const input = page.locator("#combo input[role=combobox]")
	await expect(input).toHaveAttribute("aria-required", "true")
	await input.focus()
	await page.keyboard.press("ArrowDown")
	await expect(input).toHaveAttribute("aria-expanded", "true")
	await page.keyboard.press("ArrowDown")
	const active = await activeDescendant(input)
	await expect(active).toHaveAttribute("data-highlighted", "")
	await expect(input).toBeFocused()
	// Typing filters; the cursor (and the pointer) move to the first visible match.
	await input.fill("bra")
	await expect(await activeDescendant(input)).toHaveText("Bratislava")
})

test("Combobox: grouped options sit in labelled groups", async ({page}) => {
	await page.locator("#combo-groups input").click()
	const groups = page.locator(".combobox-listbox [role=group]")
	await expect(groups).toHaveCount(2)
	await expect(groups.first()).toHaveAttribute("aria-label", "Fruits")
})

test("Combobox: chips outside the control have a reachable remove button", async ({page}) => {
	const remove = page.locator("#combo-tags .fluent-chip-remove").first()
	await expect(remove).toHaveAttribute("tabindex", "0")
	await expect(remove).toHaveAccessibleName(/Remove Prague/)
})

test("Autocomplete: the input is the combobox over a real listbox", async ({page}) => {
	const input = page.locator("#ac-form input")
	await expect(input).toHaveAttribute("role", "combobox")
	await expect(input).toHaveAttribute("aria-required", "true")
	await expect(page.getByLabel("Country")).toHaveAttribute("role", "combobox")

	await input.focus()
	await page.keyboard.press("ArrowDown") // opens the list
	await expect(input).toHaveAttribute("aria-expanded", "true")
	const listbox = page.locator(`[id="${await input.getAttribute("aria-controls")}"]`)
	await expect(listbox).toHaveAttribute("role", "listbox")
	await expect(listbox.locator("[role=option]")).toHaveCount(3)

	await page.keyboard.press("ArrowDown")
	const active = await activeDescendant(input)
	await expect(active).toHaveAttribute("role", "option")
	await expect(active).toHaveAttribute("aria-selected", "true")
	await expect(input).toBeFocused()
})

test("Autocomplete: required takes part in form validity", async ({page}) => {
	await page.locator("#ac-check").click()
	await expect(page.locator("#form-valid")).toHaveText("false")

	const input = page.locator("#ac-form input")
	await input.fill("Slov")
	await page.locator(".option-item", {hasText: "Slovakia"}).click()
	await expect(page.locator("#countries")).toHaveText("sk")
	await page.keyboard.press("Escape") // multi-select keeps the list open over the button
	await page.locator("#ac-check").click()
	await expect(page.locator("#form-valid")).toHaveText("true")
})
