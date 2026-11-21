import {test, expect} from "@playwright/test"

/**
 * The runes services that replaced the 1.x stores (2.0.0): `toast`, `settings`, `navigation`.
 * Fixture: docs/src/routes/test/services/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/services")
	await page.evaluate(() => localStorage.clear())
	await page.reload()
})

test("toast.items is reactive; the default title is translated", async ({page}) => {
	await page.click("#toast-success")
	await page.click("#toast-titled")
	await expect(page.locator("#toast-count")).toHaveText("2")
	const titles = page.locator(".fluent-toast__title")
	await expect(titles).toHaveText(["Success", "Custom"])

	await page.click("#locale-de")
	await expect(titles).toHaveText(["Erfolg", "Custom"])

	await page.click("#toast-clear")
	await expect(page.locator("#toast-count")).toHaveText("0")
	await expect(titles).toHaveCount(0)
})

test("settings applies the theme to <html> and persists it (not the direction)", async ({page}) => {
	const html = page.locator("html")
	await page.click("#theme-dark")
	await expect(page.locator("#theme-mode")).toHaveText("dark")
	await expect(page.locator("#theme-effective")).toHaveText("dark")
	await expect(html).toHaveAttribute("data-theme", "dark")

	await page.click("#settings-rtl")
	await expect(html).toHaveAttribute("dir", "rtl")

	await page.reload()
	await expect(page.locator("#theme-mode")).toHaveText("dark")
	await expect(html).toHaveAttribute("data-theme", "dark")
	await expect(html).toHaveAttribute("dir", "ltr")

	await page.click("#theme-toggle")
	await expect(html).toHaveAttribute("data-theme", "light")

	await page.click("#settings-reset")
	await expect(page.locator("#theme-mode")).toHaveText("system")
})

test("settings 'system' follows the OS colour scheme", async ({page}) => {
	await page.emulateMedia({colorScheme: "dark"})
	await page.reload()
	await expect(page.locator("#theme-mode")).toHaveText("system")
	await expect(page.locator("#theme-effective")).toHaveText("dark")
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")

	await page.emulateMedia({colorScheme: "light"})
	await expect(page.locator("#theme-effective")).toHaveText("light")
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
})

test("navigation remembers a group across reloads", async ({page}) => {
	await expect(page.locator("#nav-state")).toHaveText("false")
	await page.click("#nav-set")
	await expect(page.locator("#nav-state")).toHaveText("true")
	await page.reload()
	await expect(page.locator("#nav-state")).toHaveText("true")
})
