import {test, expect} from "@playwright/test"

/**
 * TopNav items on the action-item model (2.0.0): onClick + onAction, a vetoable link,
 * disabled items. Fixture: docs/src/routes/test/topnav/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/topnav")
})

const bar = (page) => page.locator(".topnav-items")

test("action item runs onClick then onAction; disabled item doesn't", async ({page}) => {
	await bar(page).getByText("Do it").click()
	await bar(page).getByText("Off").click({force: true})
	await expect(page.locator("#log")).toHaveText("click:act | action:act")
})

test("beforeActionCallback can veto a link; allowed links navigate", async ({page}) => {
	await bar(page).getByText("Go").click()
	await expect(page).toHaveURL(/\/test\/topnav$/)
	await page.locator("#unblock").click()
	await bar(page).getByText("Go").click()
	await expect(page).toHaveURL(/\/test\/menus$/)
})
