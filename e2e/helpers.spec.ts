import {test, expect} from "@playwright/test"
import {normalizeForSearch, containsText, startsWithText} from "../packages/svelte-fluentui/src/lib/helpers/text.js"
import {debounce} from "../packages/svelte-fluentui/src/lib/helpers/debounce.js"

/**
 * Pure helpers (no browser): run in the Playwright worker since the library has
 * no unit-test runner. Component behaviour built on them is covered by the
 * Select/Combobox/Autocomplete/GridCellEditor specs.
 */

test.describe("helpers/text", () => {
	test("normalizeForSearch folds case and diacritics unless asked not to", () => {
		expect(normalizeForSearch("Žluťoučký KŮŇ")).toBe("zlutoucky kun")
		expect(normalizeForSearch("Žluť", {diacritics: true})).toBe("žluť")
	})

	test("containsText / startsWithText", () => {
		expect(containsText("Žluťoučký kůň", "KUN")).toBe(true)
		expect(containsText("Žluťoučký kůň", "kun", {diacritics: true})).toBe(false)
		expect(containsText("Apple", "")).toBe(true)
		expect(startsWithText("Charlie", "ch")).toBe(true)
		expect(startsWithText("Charlie", "ha")).toBe(false)
	})
})

test.describe("helpers/debounce", () => {
	test("runs once with the last arguments; cancel drops the pending call", async () => {
		const calls: string[] = []
		const d = debounce((v: string) => calls.push(v), 20)
		d("a")
		d("b")
		expect(d.pending).toBe(true)
		await new Promise(r => setTimeout(r, 50))
		expect(calls).toEqual(["b"])
		expect(d.pending).toBe(false)

		d("c")
		d.cancel()
		await new Promise(r => setTimeout(r, 50))
		expect(calls).toEqual(["b"])
	})

	test("reads a getter delay on every call", async () => {
		let delay = 0
		const calls: number[] = []
		const d = debounce((v: number) => calls.push(v), () => delay)
		d(1)
		await new Promise(r => setTimeout(r, 10))
		expect(calls).toEqual([1])
		delay = 60
		d(2)
		await new Promise(r => setTimeout(r, 20))
		expect(calls).toEqual([1])
		await new Promise(r => setTimeout(r, 60))
		expect(calls).toEqual([1, 2])
	})
})
