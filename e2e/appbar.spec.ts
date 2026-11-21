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

/* ---------- 2.0: bar surface, active indicator, overflow popover, tooltip ---------- */

const ovItem = (page, i: number) => page.locator(`#ov-bar .fluent-appbar-items > .fluent-appbar-item:has(a#ov-${i})`)
const more = (page) => page.locator("#ov-bar .fluent-appbar-more")
const popover = (page) => page.locator(".fluent-appbar-popover")

test("items that don't fit are hidden + inert and the more button appears", async ({page}) => {
	await expect(more(page)).toBeVisible()
	await expect(more(page)).toHaveAccessibleName("View more apps")
	await expect(ovItem(page, 0)).not.toHaveAttribute("data-overflowed")
	await expect(ovItem(page, 6)).toHaveAttribute("data-overflowed", "true")
	await expect(ovItem(page, 6)).toHaveAttribute("inert", "")
	await expect(ovItem(page, 6)).toBeHidden()
	// Growing the bar brings everything back and removes the button.
	await page.locator("#grow").click()
	await expect(ovItem(page, 6)).not.toHaveAttribute("data-overflowed")
	await expect(more(page)).toHaveCount(0)
})

test("the popover lists the hidden items in order; picking one closes it", async ({page}) => {
	await more(page).click()
	await expect(popover(page)).toBeVisible()
	await expect(popover(page)).toHaveAttribute("role", "dialog")
	await expect(more(page)).toHaveAttribute("aria-expanded", "true")
	const labels = await popover(page).locator(".fluent-appbar-item-label").allTextContents()
	expect(labels.length).toBeGreaterThan(0)
	expect(labels.at(-1)).toBe("Settings")
	expect(labels).not.toContain("Resources")
	// Popover tiles carry no id (the bar's link keeps it) and no active indicator orientation.
	await expect(popover(page).locator("a[id]")).toHaveCount(0)
	await popover(page).getByRole("link", {name: "Settings"}).click()
	await expect(page.locator("#clicked")).toHaveText("Settings")
	await expect(popover(page)).toHaveCount(0)
	await expect(page.locator("#overflow-events")).toHaveText("true,false")
})

test("the search focuses on open, searches all items (diacritics-insensitive) and shows an empty state", async ({page}) => {
	await more(page).click()
	await expect(popover(page).locator("fluent-search")).toBeFocused()
	await page.keyboard.type("zurn")
	await expect(popover(page).locator(".fluent-appbar-item-label")).toHaveText(["Žurnál"])
	await page.keyboard.press("Control+A")
	await page.keyboard.type("res")
	// A visible item is found too.
	await expect(popover(page).locator(".fluent-appbar-item-label")).toHaveText(["Resources"])
	await page.keyboard.press("Control+A")
	await page.keyboard.type("nothing")
	await expect(popover(page).locator(".fluent-appbar-popover-empty")).toHaveText("No apps found")
})

test("Escape and an outside click close the popover; Escape returns focus to the button", async ({page}) => {
	await more(page).click()
	await expect(popover(page)).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(popover(page)).toHaveCount(0)
	await expect(more(page)).toBeFocused()
	await more(page).click()
	await expect(popover(page)).toBeVisible()
	await page.mouse.click(600, 20)
	await expect(popover(page)).toHaveCount(0)
})

test("active item shows the indicator on the start edge (vertical) and the bottom (horizontal)", async ({page}) => {
	const vertical = await page.locator("a#ov-1").evaluate((a) => {
		const s = getComputedStyle(a, "::before")
		return {content: s.content, width: s.width, left: s.left}
	})
	expect(vertical.content).toBe('""')
	expect(parseFloat(vertical.width)).toBeGreaterThan(0)
	const inactive = await page.locator("a#ov-0").evaluate((a) => getComputedStyle(a, "::before").content)
	expect(inactive).toBe("none")
	const horizontal = await page.locator("a#h-0").evaluate((a) => {
		const s = getComputedStyle(a, "::before")
		const r = a.getBoundingClientRect()
		return {content: s.content, height: parseFloat(s.height), bottom: parseFloat(s.bottom), linkHeight: r.height}
	})
	expect(horizontal.content).toBe('""')
	expect(horizontal.height).toBeLessThan(horizontal.linkHeight / 2)
})

test("horizontal bar lays items in a row and overflows into the popover", async ({page}) => {
	const boxes = await Promise.all([0, 1].map((i) => page.locator(`a#h-${i}`).boundingBox()))
	expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(1)
	expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x)
	await expect(page.locator("#h-bar .fluent-appbar-more")).toBeVisible()
})

test("tooltip prop shows our Tooltip on hover", async ({page}) => {
	await page.locator("a#ov-0").hover()
	await expect(page.getByText("Resources tooltip")).toBeVisible()
})

test("count badge defaults to the danger palette", async ({page}) => {
	const bg = await badge(page, "inbox").evaluate((el) => getComputedStyle(el).backgroundColor)
	expect(bg).toBe("rgb(197, 15, 31)")
})

test("an item without href is a button: focusable and activated by Enter / Space", async ({page}) => {
	const action = page.locator("button#action")
	await expect(action).toHaveAttribute("type", "button")
	await expect(page.getByRole("button", {name: "Action"})).toHaveCount(1)
	await action.focus()
	await page.keyboard.press("Enter")
	await page.keyboard.press(" ")
	await action.click()
	await expect(page.locator("#action-count")).toHaveText("3")
	await expect(action).not.toHaveAttribute("href")
})
