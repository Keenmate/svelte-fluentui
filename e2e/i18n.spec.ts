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
