import {test, expect, type Page} from "@playwright/test"

/**
 * Keyboard access to the inline selected-value chips of a multi-select
 * Autocomplete / Combobox (helpers/chip-nav.ts): ArrowLeft from the start of the
 * input moves onto the chips, arrows move between them, Backspace / Delete remove
 * the focused chip (any chip, not only the last), End / ArrowRight past the last
 * chip return to the input, typing returns to the input.
 * Fixture: docs/src/routes/test/chips-keyboard/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/chips-keyboard")
})

const focusedLabel = (page: Page) => page.evaluate(() => {
	const el = document.activeElement as HTMLElement | null
	return el?.getAttribute("aria-label") ?? el?.id ?? null
})

const hosts = [
	{name: "Autocomplete", input: "#ac-input", value: "#ac-value"},
	{name: "Combobox", input: "#cb", value: "#cb-value"}
]

for (const host of hosts) {
	test.describe(host.name, () => {
		test("ArrowLeft from an empty input walks the chips; ArrowRight / End return to the input", async ({page}) => {
			const input = page.locator(host.input)
			await input.focus()
			await page.keyboard.press("ArrowLeft")
			expect(await focusedLabel(page)).toBe("Remove Cherry")
			await page.keyboard.press("ArrowLeft")
			expect(await focusedLabel(page)).toBe("Remove Banana")
			await page.keyboard.press("Home")
			expect(await focusedLabel(page)).toBe("Remove Apple")
			await page.keyboard.press("ArrowLeft")
			expect(await focusedLabel(page)).toBe("Remove Apple")
			await page.keyboard.press("ArrowRight")
			await page.keyboard.press("ArrowRight")
			expect(await focusedLabel(page)).toBe("Remove Cherry")
			await page.keyboard.press("ArrowRight")
			await expect(input).toBeFocused()
			await page.keyboard.press("ArrowLeft")
			await page.keyboard.press("End")
			await expect(input).toBeFocused()
			// Nothing was removed by navigating.
			await expect(page.locator(host.value)).toHaveText("a,b,c")
		})

		test("Backspace removes the focused middle chip and focuses the previous one", async ({page}) => {
			await page.locator(host.input).focus()
			await page.keyboard.press("ArrowLeft")
			await page.keyboard.press("ArrowLeft")
			expect(await focusedLabel(page)).toBe("Remove Banana")
			await page.keyboard.press("Backspace")
			await expect(page.locator(host.value)).toHaveText("a,c")
			await expect.poll(() => focusedLabel(page)).toBe("Remove Apple")
		})

		test("Delete removes the focused chip and focuses the next one (or the input)", async ({page}) => {
			const input = page.locator(host.input)
			await input.focus()
			await page.keyboard.press("ArrowLeft")
			await page.keyboard.press("Home")
			await page.keyboard.press("Delete")
			await expect(page.locator(host.value)).toHaveText("b,c")
			await expect.poll(() => focusedLabel(page)).toBe("Remove Banana")
			await page.keyboard.press("ArrowRight")
			await page.keyboard.press("Delete")
			await expect(page.locator(host.value)).toHaveText("b")
			await expect(input).toBeFocused()
		})

		test("Enter on a focused chip removes it and returns to the input", async ({page}) => {
			const input = page.locator(host.input)
			await input.focus()
			await page.keyboard.press("ArrowLeft")
			await page.keyboard.press("ArrowLeft")
			await page.keyboard.press("Enter")
			await expect(page.locator(host.value)).toHaveText("a,c")
			await expect(input).toBeFocused()
		})

		test("typing on a chip goes back to the input", async ({page}) => {
			const input = page.locator(host.input)
			await input.focus()
			await page.keyboard.press("ArrowLeft")
			await page.keyboard.press("d")
			await expect(input).toBeFocused()
			await expect(input).toHaveValue("d")
			await expect(page.locator(host.value)).toHaveText("a,b,c")
		})

		test("ArrowLeft with text before the caret stays in the input", async ({page}) => {
			const input = page.locator(host.input)
			await input.focus()
			await page.keyboard.type("x")
			await page.keyboard.press("ArrowLeft")
			await expect(input).toBeFocused()
			await page.keyboard.press("ArrowLeft")
			expect(await focusedLabel(page)).toBe("Remove Cherry")
		})

		test("chips stay out of the Tab order", async ({page}) => {
			const removes = page.locator(`${host.input}`).locator("xpath=ancestor::*[contains(@class,'-main')][1]").locator(".fluent-chip-remove")
			await expect(removes).toHaveCount(3)
			for (const el of await removes.all()) await expect(el).toHaveAttribute("tabindex", "-1")
		})
	})
}
