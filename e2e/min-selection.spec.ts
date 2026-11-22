import {test, expect, type Page} from "@playwright/test"

/**
 * `minSelectionCount` (Autocomplete, Combobox / Select `multiple`) and `required` take part in form
 * validation: 1 … min − 1 picked is invalid with a translated message, none picked is valid unless
 * required. Select validates through an invisible stand-in input that hands focus to the real control.
 * Fixture: docs/src/routes/test/min-selection/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/min-selection")
})

/** Form validity + the messages of its invalid fields. */
const formState = (page: Page, form: string) =>
	page.locator(`#${form}`).evaluate((f: HTMLFormElement) => ({
		valid: f.checkValidity(),
		messages: [...f.elements].map((el) => (el as HTMLInputElement).validationMessage).filter(Boolean)
	}))

for (const id of ["ac", "cb", "sel"]) {
	test(`${id}: none picked is valid, one of min 2 is invalid with a message, two is valid`, async ({page}) => {
		await expect.poll(() => formState(page, `f-${id}`)).toEqual({valid: true, messages: []})
		await page.locator(`#${id}-one`).click()
		await expect.poll(() => formState(page, `f-${id}`)).toEqual({valid: false, messages: ["Select at least 2 items."]})
		await page.locator(`#${id}-two`).click()
		await expect.poll(() => formState(page, `f-${id}`)).toEqual({valid: true, messages: []})
	})
}

test("Select required: an empty field fails validation; reporting it focuses the trigger", async ({page}) => {
	await expect.poll(async () => (await formState(page, "f-sel-required")).valid).toBe(false)
	await page.locator("#f-sel-required").evaluate((f: HTMLFormElement) => f.reportValidity())
	await expect(page.locator("#sel-required")).toBeFocused()
	await page.locator("#sel-required-pick").click()
	await expect.poll(async () => (await formState(page, "f-sel-required")).valid).toBe(true)
})

test("Select multiple: reporting the min error focuses the listbox", async ({page}) => {
	await page.locator("#sel-one").click()
	await page.locator("#f-sel").evaluate((f: HTMLFormElement) => f.reportValidity())
	await expect(page.locator("#sel")).toBeFocused()
})

test("Combobox multiple required: empty fails validation, one pick passes", async ({page}) => {
	await expect.poll(async () => (await formState(page, "f-cb-required")).valid).toBe(false)
	await page.locator("#cb-required-pick").click()
	await expect.poll(async () => (await formState(page, "f-cb-required")).valid).toBe(true)
})
