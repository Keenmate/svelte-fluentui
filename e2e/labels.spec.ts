import {test, expect, type Page} from "@playwright/test"

/**
 * Per-instance `labels` prop (2.0.0): each component renders the strings passed in
 * `labels` (its `svelteFluentUI.<component>.*` keys, ICU syntax), and keeps the
 * English dictionary text without it. The fixture renders every component twice: `def-*`
 * without labels, `cus-*` with Czech labels.
 * Fixture: docs/src/routes/test/labels/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/labels")
})

const elementValue = (page: Page, selector: string) =>
	page.locator(selector).evaluate((el) => (el as HTMLInputElement).value)

test.describe("TimePicker", () => {
	const root = (page: Page, kind: string) => page.locator(`.fluent-timepicker:has(#${kind}-tp)`)

	test("defaults", async ({page}) => {
		await expect(page.locator("#def-tp-empty")).toHaveAttribute("placeholder", "Select time")
		expect(await elementValue(page, "#def-tp")).toBe("09:30 AM")
		await expect(root(page, "def").locator(".clear-button")).toHaveAttribute("aria-label", "Clear time")
		const clock = root(page, "def").locator(".clock-button")
		await expect(clock).toHaveAttribute("aria-label", "Open time picker")
		await clock.click()
		const popup = page.locator(".time-picker-panel")
		await expect(popup).toHaveAttribute("aria-label", "Choose time")
		await expect(popup.locator(".column-label")).toHaveText(["Hour", "Minute", "Period"])
		await expect(popup.locator(".period-column .time-option")).toHaveText(["AM", "PM"])
		await expect(popup.locator(".time-actions")).toHaveText("OK")
	})

	test("custom labels", async ({page}) => {
		await expect(page.locator("#cus-tp-empty")).toHaveAttribute("placeholder", "Vyberte čas")
		expect(await elementValue(page, "#cus-tp")).toBe("09:30 dop.")
		await expect(root(page, "cus").locator(".clear-button")).toHaveAttribute("aria-label", "Vymazat čas")
		const clock = root(page, "cus").locator(".clock-button")
		await expect(clock).toHaveAttribute("aria-label", "Otevřít hodiny")
		await clock.click()
		const popup = page.locator(".time-picker-panel")
		await expect(popup).toHaveAttribute("aria-label", "Zvolte čas")
		await expect(popup.locator(".column-label")).toHaveText(["Hodina", "Minuta", "Část dne"])
		await expect(popup.locator(".period-column .time-option")).toHaveText(["dop.", "odp."])
		await expect(popup.locator(".time-actions")).toHaveText("Použít")
	})
})

test.describe("DatePicker + Calendar", () => {
	const root = (page: Page, kind: string) => page.locator(`.fluent-datepicker:has(#${kind}-dp)`)

	test("defaults", async ({page}) => {
		await expect(page.locator("#def-dp-empty")).toHaveAttribute("placeholder", "Select a date")
		await expect(root(page, "def").locator(".clear-button")).toHaveAttribute("aria-label", "Clear date")
		const button = root(page, "def").locator(".calendar-button")
		await expect(button).toHaveAttribute("aria-label", "Open calendar")
		await button.click()
		const popup = page.locator(".datepicker-popup")
		await expect(popup).toHaveAttribute("aria-label", "Choose date")
		await expect(popup.locator(".previous")).toHaveAttribute("aria-label", "April")
		await expect(page.locator("#def-cal .previous")).toHaveAttribute("aria-label", "April")
		await expect(page.locator("#def-cal .next")).toHaveAttribute("title", "June")
	})

	test("custom labels", async ({page}) => {
		await expect(page.locator("#cus-dp-empty")).toHaveAttribute("placeholder", "Vyberte datum")
		await expect(root(page, "cus").locator(".clear-button")).toHaveAttribute("aria-label", "Vymazat datum")
		const button = root(page, "cus").locator(".calendar-button")
		await expect(button).toHaveAttribute("aria-label", "Otevřít kalendář")
		await button.click()
		const popup = page.locator(".datepicker-popup")
		await expect(popup).toHaveAttribute("aria-label", "Zvolte datum")
		// DatePicker forwards its labels to the popup Calendar.
		await expect(popup.locator(".previous")).toHaveAttribute("aria-label", "Předchozí: April")
		await expect(page.locator("#cus-cal .previous")).toHaveAttribute("aria-label", "Předchozí: April")
		await expect(page.locator("#cus-cal .next")).toHaveAttribute("title", "Další: June")
	})
})

test.describe("Paginator", () => {
	test("defaults", async ({page}) => {
		const pg = page.locator("#def-pg")
		await expect(pg.locator("nav")).toHaveAttribute("aria-label", "Pagination")
		await expect(pg.locator("fluent-button").first()).toHaveAttribute("aria-label", "Go to first page")
		await expect(pg.locator("fluent-button").last()).toHaveAttribute("title", "Go to last page")
		await expect(pg.locator(".pagination-text")).toHaveText("Page 1 of 10")
		await expect(pg.locator(".pagination-text strong")).toHaveText(["1", "10"])
		await expect(pg.locator(".summary")).toHaveText("200 items")
		await expect(pg.locator(".summary strong")).toHaveText("200")
	})

	test("custom labels", async ({page}) => {
		const pg = page.locator("#cus-pg")
		await expect(pg.locator("nav")).toHaveAttribute("aria-label", "Stránkování")
		await expect(pg.locator("fluent-button").nth(0)).toHaveAttribute("aria-label", "První strana")
		await expect(pg.locator("fluent-button").nth(1)).toHaveAttribute("aria-label", "Předchozí strana")
		await expect(pg.locator("fluent-button").nth(2)).toHaveAttribute("aria-label", "Další strana")
		await expect(pg.locator("fluent-button").nth(3)).toHaveAttribute("title", "Poslední strana")
		await expect(pg.locator(".pagination-text")).toHaveText("Strana 1 z 10")
		await expect(pg.locator(".pagination-text strong")).toHaveText(["1", "10"])
		await expect(pg.locator(".summary")).toHaveText("200 položek")
	})
})

test.describe("Combobox / Autocomplete / Chip", () => {
	test("defaults", async ({page}) => {
		await expect(page.locator(".combobox-control:has(#def-cb) .fluent-chip-remove")).toHaveAttribute("aria-label", "Remove Apple")
		await page.locator("#def-cb").fill("zzz")
		await expect(page.locator(".combobox-no-data")).toHaveText("No results found")

		await expect(page.locator("#def-ac .fluent-chip-remove")).toHaveAttribute("aria-label", "Remove Apple")
		await expect(page.locator("#def-ac .search-button")).toHaveAttribute("aria-label", "Show options")
		await expect(page.locator("#def-ac-empty-input")).toHaveAttribute("placeholder", "Type to search...")

		await expect(page.locator("#def-chip .fluent-chip-remove")).toHaveAttribute("aria-label", "Remove Praha")
		await expect(page.locator("#def-chip .fluent-chip-remove")).toHaveAttribute("title", "Remove Praha")
	})

	test("custom labels", async ({page}) => {
		await expect(page.locator(".combobox-control:has(#cus-cb) .fluent-chip-remove")).toHaveAttribute("aria-label", "Odebrat Apple")
		await page.locator("#cus-cb").fill("zzz")
		await expect(page.locator(".combobox-no-data")).toHaveText("Nic nenalezeno")

		await expect(page.locator("#cus-ac .fluent-chip-remove")).toHaveAttribute("aria-label", "Odebrat Apple")
		await expect(page.locator("#cus-ac .search-button")).toHaveAttribute("aria-label", "Zobrazit možnosti")
		await expect(page.locator("#cus-ac-empty-input")).toHaveAttribute("placeholder", "Hledejte...")

		await expect(page.locator("#cus-chip .fluent-chip-remove")).toHaveAttribute("aria-label", "Smazat Praha")
		await expect(page.locator("#cus-chip .fluent-chip-remove")).toHaveAttribute("title", "Smazat Praha")
	})
})

test.describe("dismiss / close buttons", () => {
	test("defaults", async ({page}) => {
		// CompositeBadge's built-in × used to have no accessible name.
		await expect(page.locator("#def-cbadge .composite-badge-button")).toHaveAttribute("aria-label", "Dismiss")
		await expect(page.locator("#def-alert .fluent-alert__dismiss")).toHaveAttribute("aria-label", "Dismiss")
		await expect(page.locator("#def-toast .dismiss-button")).toHaveAttribute("aria-label", "Dismiss")
		await expect(page.locator("#def-toast .dismiss-button")).toHaveAttribute("title", "Close")
		await expect(page.locator("#def-tabs .fluent-tab-close")).toHaveAttribute("aria-label", "Close tab")
		await expect(page.locator("#def-tabs .fluent-tab-close")).toHaveAttribute("title", "Close")
		await expect(page.locator("#def-bg .badge-group-toggle")).toHaveText("+2 more")
	})

	test("custom labels", async ({page}) => {
		await expect(page.locator("#cus-cbadge .composite-badge-button")).toHaveAttribute("aria-label", "Zavřít")
		await expect(page.locator("#cus-alert .fluent-alert__dismiss")).toHaveAttribute("aria-label", "Skrýt")
		await expect(page.locator("#cus-toast .dismiss-button")).toHaveAttribute("aria-label", "Zavřít oznámení")
		await expect(page.locator("#cus-toast .dismiss-button")).toHaveAttribute("title", "Zavřít")
		await expect(page.locator("#cus-tabs .fluent-tab-close")).toHaveAttribute("aria-label", "Zavřít kartu")
		await expect(page.locator("#cus-tabs .fluent-tab-close")).toHaveAttribute("title", "Zavřít")
		await expect(page.locator("#cus-bg .badge-group-toggle")).toHaveText("+2 další")
	})
})

test.describe("Dialog", () => {
	for (const [kind, close, dismiss] of [["def", "Close dialog", "Dismiss"], ["cus", "Zavřít dialog", "Zrušit"]]) {
		test(`${kind === "def" ? "defaults" : "custom labels"}`, async ({page}) => {
			await page.locator(`#${kind}-dialog-open`).click()
			const dialog = page.locator(`#${kind}-dlg`)
			await expect(dialog.locator(`[aria-label="${close}"]`).first()).toBeAttached()
			await expect(dialog.locator("fluent-button").filter({hasText: dismiss})).toHaveCount(1)
		})
	}
})

test.describe("CommandPalette", () => {
	test("defaults", async ({page}) => {
		await page.locator("#def-palette-open").click()
		const dialog = page.locator(".cp-panel")
		await expect(dialog).toHaveAttribute("aria-label", "Command palette")
		await expect(dialog.locator(".cp-input")).toHaveAttribute("placeholder", "Search…")
		await expect(dialog.locator("[role=listbox]")).toHaveAttribute("aria-label", "Command palette results")
		await expect(dialog.locator(".cp-kbd-hint")).toHaveText("esc to close")
		await expect(dialog.locator(".cp-empty")).toHaveText("No items")
		await expect(dialog.locator(".cp-footer")).toContainText("navigate")
	})

	test("custom labels", async ({page}) => {
		await page.locator("#cus-palette-open").click()
		const dialog = page.locator(".cp-panel")
		await expect(dialog).toHaveAttribute("aria-label", "Paleta příkazů")
		await expect(dialog.locator(".cp-input")).toHaveAttribute("placeholder", "Hledat…")
		await expect(dialog.locator(".cp-input")).toHaveAttribute("aria-label", "Hledat…")
		await expect(dialog.locator("[role=listbox]")).toHaveAttribute("aria-label", "Výsledky")
		await expect(dialog.locator(".cp-kbd-hint")).toHaveText("esc zavře")
		await expect(dialog.locator(".cp-empty")).toHaveText("Žádné položky")
		await expect(dialog.locator(".cp-footer")).toContainText("pohyb")
		await expect(dialog.locator(".cp-footer")).toContainText("výběr")
		await expect(dialog.locator(".cp-footer")).toContainText("přepnout")
	})
})
