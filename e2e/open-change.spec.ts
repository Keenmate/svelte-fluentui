import {test, expect, type Page} from "@playwright/test"

/**
 * onOpenChange({open}) contract shared by Select, Combobox, Autocomplete, DatePicker
 * and TimePicker (2.0.0): fires on every real open/close after mount — user action
 * or programmatic `bind:open` — and never on initial render, even when `open`
 * starts `true`.
 * Fixture: docs/src/routes/test/open-change/+page.svelte (?c=<component>&open=1);
 * the component mounts on the #oc-mount click.
 */

async function load(page: Page, c: string, open = false) {
	await page.goto(`/test/open-change?c=${c}${open ? "&open=1" : ""}`)
	await page.locator("#oc-mount").click()
	await expect(page.locator("#oc-control")).toBeAttached()
}

type Case = {
	c: string
	/** Opens the popup the way a user would. */
	userOpen: (page: Page) => Promise<void>
	/** Something visible only while the popup is open. */
	popup: (page: Page) => ReturnType<Page["locator"]>
}

const cases: Case[] = [
	{
		c: "select",
		userOpen: async page => { await page.locator("#oc-control").click() },
		popup: page => page.getByRole("option", {name: "Echo"})
	},
	{
		c: "combobox",
		userOpen: async page => {
			await page.locator("#oc-control").click()
			await page.locator("#oc-control").press("ArrowDown")
		},
		popup: page => page.getByRole("option", {name: "Golf"})
	},
	{
		c: "autocomplete",
		userOpen: async page => { await page.locator("#oc .autocomplete-native-input").fill("a") },
		popup: page => page.locator(".options-list")
	},
	{
		c: "datepicker",
		userOpen: async page => { await page.locator("#oc .calendar-button").click() },
		popup: page => page.locator(".positioning-region")
	},
	{
		c: "timepicker",
		userOpen: async page => { await page.locator("#oc .clock-button").click() },
		popup: page => page.locator(".time-picker-panel")
	}
]

for (const {c, userOpen, popup} of cases) {
	test.describe(c, () => {
		test("no onOpenChange on mount when open starts true", async ({page}) => {
			await load(page, c, true)
			await expect(popup(page)).toBeVisible()
			// Give any deferred effects a chance to (wrongly) fire.
			await page.waitForTimeout(300)
			await expect(page.locator("#oc-log")).toHaveText("")
			// A later real change still fires.
			await page.locator("#oc-set-close").click()
			await expect(popup(page)).toBeHidden()
			await expect(page.locator("#oc-log")).toHaveText("false")
		})

		test("fires on user open/close and on programmatic open/close", async ({page}) => {
			await load(page, c)
			const log = page.locator("#oc-log")
			await expect(popup(page)).toBeHidden()
			await expect(log).toHaveText("")

			await userOpen(page)
			await expect(popup(page)).toBeVisible()
			await expect(log).toHaveText("true")
			await page.keyboard.press("Escape")
			await expect(popup(page)).toBeHidden()
			await expect(log).toHaveText("true,false")

			await page.locator("#oc-set-open").click()
			await expect(popup(page)).toBeVisible()
			await expect(log).toHaveText("true,false,true")
			await page.locator("#oc-set-close").click()
			await expect(popup(page)).toBeHidden()
			await expect(log).toHaveText("true,false,true,false")
		})
	})
}
