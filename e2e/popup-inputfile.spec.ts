import {test, expect, type Page} from "@playwright/test"

/**
 * InputFile (2.0.0 Phase 3): the popover list closes via helpers/dismiss.ts
 * (outside press / focus), and the document drag listeners are attached only
 * while they can do something.
 * Fixture: docs/src/routes/test/popup-inputfile/+page.svelte
 */

const popover = (page: Page) => page.locator(".minimal-popover")

async function openPopover(page: Page) {
	await page.locator("#pop input[type=file]").setInputFiles([
		{name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("a")},
		{name: "b.txt", mimeType: "text/plain", buffer: Buffer.from("b")}
	])
	await page.locator("#pop .minimal-trigger").click()
	await expect(popover(page)).toBeVisible()
}

test.describe("popover", () => {
	test.beforeEach(async ({page}) => {
		await page.goto("/test/popup-inputfile")
	})

	test("outside press closes; presses inside and on the trigger don't dismiss", async ({page}) => {
		await openPopover(page)
		await popover(page).click({position: {x: 5, y: 5}})
		await expect(popover(page)).toBeVisible()
		await page.locator("#pop .minimal-trigger").click()
		await expect(popover(page)).toBeHidden()
		await page.locator("#pop .minimal-trigger").click()
		await expect(popover(page)).toBeVisible()
		await page.locator("#outside").click()
		await expect(popover(page)).toBeHidden()
	})

	test("focus moving outside closes it", async ({page}) => {
		await openPopover(page)
		await page.locator("#outside").focus()
		await expect(popover(page)).toBeHidden()
	})

	test("Escape closes it", async ({page}) => {
		await openPopover(page)
		await page.keyboard.press("Escape")
		await expect(popover(page)).toBeHidden()
	})
})

test("document drag listeners: none for overlay-less selectors, end-of-drag ones only during a drag", async ({page}) => {
	// Count live document/window listeners per event type.
	await page.addInitScript(() => {
		const live: Record<string, number> = {}
		;(window as any).__live = live
		for (const target of [Document.prototype, Window.prototype]) {
			const add = target.addEventListener
			const remove = target.removeEventListener
			target.addEventListener = function (this: EventTarget, type: string, ...rest: any[]) {
				if (/^(drag|drop|blur$)/.test(type)) live[type] = (live[type] ?? 0) + 1
				return (add as any).call(this, type, ...rest)
			}
			target.removeEventListener = function (this: EventTarget, type: string, ...rest: any[]) {
				if (/^(drag|drop|blur$)/.test(type)) live[type] = (live[type] ?? 0) - 1
				return (remove as any).call(this, type, ...rest)
			}
		}
	})
	await page.goto("/test/popup-inputfile")
	await expect(page.locator("#card-drag input[type=file]")).toBeAttached()
	const live = () => page.evaluate(() => ({...(window as any).__live}))

	// Only the card instance listens, and only for the drag start.
	expect((await live()).dragenter).toBe(1)
	expect((await live()).dragleave ?? 0).toBe(0)
	expect((await live()).drop ?? 0).toBe(0)

	// A file drag enters the page: the end-of-drag listeners attach, the overlay shows.
	await page.evaluate(() => {
		const dt = new DataTransfer()
		dt.items.add(new File(["x"], "x.txt", {type: "text/plain"}))
		document.body.dispatchEvent(new DragEvent("dragenter", {bubbles: true, dataTransfer: dt}))
	})
	await expect(page.locator(".drag-overlay")).toBeVisible()
	expect((await live()).dragleave).toBe(1)
	expect((await live()).drop).toBe(1)

	// The drag leaves the window: overlay gone, listeners detached again.
	await page.evaluate(() => document.body.dispatchEvent(new DragEvent("dragleave", {bubbles: true, relatedTarget: null})))
	await expect(page.locator(".drag-overlay")).toHaveCount(0)
	expect((await live()).dragleave).toBe(0)
	expect((await live()).drop).toBe(0)
	expect((await live()).dragenter).toBe(1)
})
