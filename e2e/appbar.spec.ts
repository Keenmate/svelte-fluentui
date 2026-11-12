import {test, expect} from "@playwright/test"

/**
 * AppBarItem `count` badge (+ `countLabel`, consumer aria-label) and NavLinkItem `linkProps` (2.0.0, Q19): rendered on the icon, hidden at 0 / undefined,
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

test("countLabel words the count in the accessible name (full, uncapped count)", async ({page}) => {
	await expect(item(page, "worded")).toHaveAccessibleName(/^Worded\s*, 3 unread$/)
	await expect(badge(page, "worded")).toHaveText("3")
	await page.locator("#big").click()
	await expect(item(page, "worded")).toHaveAccessibleName(/^Worded\s*, 250 unread$/)
	await expect(badge(page, "worded")).toHaveText("99+")
})

test("a consumer aria-label still announces the count", async ({page}) => {
	await expect(item(page, "labelled")).toHaveAttribute("aria-label", "Mailbox, 3 unread")
	await expect(item(page, "labelled")).toHaveAccessibleName("Mailbox, 3 unread")
	await page.locator("#zero").click()
	await expect(item(page, "labelled")).toHaveAccessibleName("Mailbox")
	await expect(item(page, "labelled-nocount")).toHaveAccessibleName("Plain label")
})

test("a consumer aria-labelledby gets the hidden count text appended", async ({page}) => {
	await expect(item(page, "labelledby")).toHaveAccessibleName(/^Messages\s*, 3$/)
	await page.locator("#zero").click()
	await expect(item(page, "labelledby")).toHaveAttribute("aria-labelledby", "ext-label")
	await expect(item(page, "labelledby")).toHaveAccessibleName("Messages")
})

test("anchor attributes (rel, target) reach the inner a via rest", async ({page}) => {
	await expect(item(page, "ext")).toHaveAttribute("rel", "noopener noreferrer")
	await expect(item(page, "ext")).toHaveAttribute("target", "_blank")
})

test("NavLinkItem linkProps go to the inner link, rest stays on the outer item", async ({page}) => {
	const outer = page.locator("#nav-download")
	await expect(outer).toHaveAttribute("role", "menuitem")
	await expect(outer).toHaveClass(/outer-class/)
	await expect(outer).toHaveAttribute("data-outer", "yes")
	const link = outer.locator("a.fluent-nav-link")
	await expect(link).toHaveAttribute("href", "/files/report.csv")
	await expect(link).toHaveAttribute("download", "report.csv")
	await expect(link).toHaveAttribute("hreflang", "en")
	await expect(link).toHaveAttribute("data-inner", "yes")
	await expect(outer).not.toHaveAttribute("download")
	await expect(link).not.toHaveAttribute("data-outer")
})

test("NavLinkItem top-level link props win over linkProps, others merge", async ({page}) => {
	const link = page.locator("#nav-external a.fluent-nav-link")
	await expect(link).toHaveAttribute("rel", "noopener")
	await expect(link).toHaveAttribute("target", "_blank")
})
