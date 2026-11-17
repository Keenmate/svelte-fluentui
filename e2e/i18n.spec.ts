import {test, expect} from "@playwright/test"

/**
 * i18n service (svelte-i18n): built-in English, `setLocale("de")` switches open components to the
 * German dictionary, a `labels` prop overrides one instance in every locale.
 * Fixture: docs/src/routes/test/i18n/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/i18n")
})

test("English by default; setLocale switches open components", async ({page}) => {
	const dismiss = page.locator("#alert-def .fluent-alert__dismiss")
	await expect(page.locator("#current")).toHaveText("en")
	await expect(dismiss).toHaveAttribute("aria-label", "Dismiss")
	await page.locator("#to-de").click()
	await expect(page.locator("#current")).toHaveText("de")
	await expect(dismiss).toHaveAttribute("aria-label", "Schließen")
	await page.locator("#to-en").click()
	await expect(dismiss).toHaveAttribute("aria-label", "Dismiss")
})

test("labels prop wins over the dictionary in every locale", async ({page}) => {
	const dismiss = page.locator("#alert-own .fluent-alert__dismiss")
	await expect(dismiss).toHaveAttribute("aria-label", "Zavřít")
	await page.locator("#to-de").click()
	await expect(dismiss).toHaveAttribute("aria-label", "Zavřít")
})

test("ICU values and plurals follow the locale", async ({page}) => {
	const def = page.locator("#pg-def")
	await expect(def).toContainText("Page 3 of 10")
	await expect(def).toContainText("1 item")
	await expect(def).not.toContainText("1 items")
	// Locale number grouping stays one bold run.
	await expect(page.locator("#pg-many strong").filter({hasText: "1,234"})).toHaveCount(1)
	await page.locator("#to-de").click()
	await expect(def).toContainText("Seite 3 von 10")
	await expect(def).toContainText("1 Eintrag")
	await expect(page.locator("#pg-many strong").filter({hasText: "1.234"})).toHaveCount(1)
})

test("labels override with an ICU value; app-level addTranslations override", async ({page}) => {
	const own = page.locator("#pg-own")
	await expect(own).toContainText("Strana 3 z 10")
	await expect(page.locator("#pg-def [aria-label='Pagination']")).toHaveCount(1)
	await page.locator("#to-de").click()
	await expect(own).toContainText("Strana 3 z 10")
	await expect(page.locator("#pg-def [aria-label='Seiten']")).toHaveCount(1)
})

test("Calendar month names follow the locale (culture default)", async ({page}) => {
	const cal = page.locator("#cal")
	await expect(cal.locator(".next")).toHaveAttribute("title", "June")
	await page.locator("#to-de").click()
	await expect(cal.locator(".next")).toHaveAttribute("title", "Juni")
})
