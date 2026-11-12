import {test, expect} from "@playwright/test"

/**
 * AppBarItem `count` badge (2.0.0, Q19): rendered on the icon, hidden at 0 / undefined,
 * capped at `maxCount` ("N+"), full count in the accessible name.
 * Fixture: docs/src/routes/test/appbar/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/appbar")
})

const item = (page, id: string) => page.locator(`a#${id}`)
const badge = (page, id: string) => item(page, id).locator(".fluent-appbar-item-count")

test("renders the count badge on the icon and tracks updates", async ({page}) => {
	await expect(badge(page, "inbox")).toBeVisible()
	await expect(badge(page, "inbox")).toHaveText("3")
	await expect(badge(page, "inbox")).toHaveAttribute("aria-hidden", "true")
	// Badge sits inside the icon wrapper so it overlays the icon.
	await expect(item(page, "inbox").locator(".fluent-appbar-item-icon .fluent-appbar-item-count")).toHaveCount(1)
	await page.locator("#inc").click()
	await expect(badge(page, "inbox")).toHaveText("4")
})

test("hides the badge when count is 0 or undefined", async ({page}) => {
	await expect(badge(page, "none")).toHaveCount(0)
	await page.locator("#zero").click()
	await expect(badge(page, "inbox")).toHaveCount(0)
	await expect(item(page, "inbox")).toHaveAccessibleName("Inbox")
})

test("caps the displayed value at maxCount (default 99)", async ({page}) => {
	await expect(badge(page, "capped")).toHaveText("9+")
	await page.locator("#big").click()
	await expect(badge(page, "inbox")).toHaveText("99+")
})

test("includes the full count in the accessible name", async ({page}) => {
	await expect(item(page, "inbox")).toHaveAccessibleName(/^Inbox\s*, 3$/)
	await expect(item(page, "capped")).toHaveAccessibleName(/^Capped\s*, 120$/)
})
