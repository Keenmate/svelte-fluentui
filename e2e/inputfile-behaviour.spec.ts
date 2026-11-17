import {test, expect, type Page} from "@playwright/test"

/**
 * InputFile: upload progress + per-row pause / resume / cancel / retry,
 * footer totals and batch actions, concurrency, validation rows (size /
 * type / dedupe / count), "show more", chips list, manual upload + chunking,
 * row reorder and keyboard removal, custom snippets, selector variants.
 * Fixture: docs/src/routes/test/inputfile-behaviour/+page.svelte
 */

test.beforeEach(async ({page}) => {
	await page.goto("/test/inputfile-behaviour")
	await expect(page.locator("#up input[type=file]")).toBeAttached()
})

const file = (name: string, size = 5, mimeType = "text/plain") => ({name, mimeType, buffer: Buffer.alloc(size, 65)})
const row = (page: Page, section: string, name: string) => page.locator(`#${section} .file-item`, {hasText: name})
const finish = (page: Page, name: string, ok = true) => page.evaluate(([n, o]) => (window as any).__finish(n, o), [name, ok] as const)
const pendingUploads = (page: Page) => page.evaluate(() => (window as any).__pending() as string[])

test("upload progress, concurrency, footer totals, completion and failure", async ({page}) => {
	await page.locator("#up input[type=file]").setInputFiles([file("a.txt"), file("b.txt"), file("c.txt")])
	// concurrency=2: two uploads in flight, the third waits.
	await expect.poll(() => pendingUploads(page)).toEqual(["a.txt", "b.txt"])
	const a = row(page, "up", "a.txt")
	await expect(a.locator("[role=progressbar]")).toHaveAttribute("aria-valuenow", "30")
	await expect(a.locator(".status-text")).toHaveText("30% — Uploading")
	await expect(row(page, "up", "c.txt").locator(".status-text")).toHaveText("Pending")
	await expect(page.locator("#up .file-count")).toHaveText("3 files")
	await expect(page.locator("#up .footer-action-button")).toHaveText(["Pause all"])
	await expect(page.locator("#up .footer-progress")).toHaveAttribute("aria-valuenow", "13")

	await finish(page, "a.txt")
	await expect(a.locator(".status-text")).toHaveText("✓ Completed")
	await expect(a.locator("a.action-button")).toHaveAttribute("download", "a.txt")
	await expect(page.locator("#up .sr-only[role=status]")).toHaveText("Uploaded a.txt")
	await expect.poll(() => pendingUploads(page)).toEqual(["b.txt", "c.txt"])

	await finish(page, "b.txt", false)
	await expect(row(page, "up", "b.txt").locator(".status-text")).toHaveText("✗ boom b.txt")
	await expect(row(page, "up", "b.txt")).toHaveClass(/error/)
	await finish(page, "c.txt")
	await expect(page.locator("#up-log")).toHaveText("error:b.txt:boom b.txt | complete:3")
	await expect(page.locator("#up .footer-stats-text")).toContainText("2 of 3 done · 1 failed")
	await expect(page.locator("#up .footer-action-button")).toHaveText(["Retry all"])

	// Retry from the row.
	await row(page, "up", "b.txt").getByRole("button", {name: "Retry upload"}).click()
	await expect.poll(() => pendingUploads(page)).toEqual(["b.txt"])
	await finish(page, "b.txt")
	await expect(row(page, "up", "b.txt").locator(".status-text")).toHaveText("✓ Completed")
	await expect(page.locator("#up .footer-stats-percent")).toHaveText("100%")
	await expect(page.locator("#up .footer-actions")).toHaveCount(0)
})

test("pause / resume / cancel per row and Pause all / Resume all", async ({page}) => {
	await page.locator("#up input[type=file]").setInputFiles([file("p.txt"), file("q.txt")])
	await expect.poll(() => pendingUploads(page)).toEqual(["p.txt", "q.txt"])
	const p = row(page, "up", "p.txt")
	await p.getByRole("button", {name: "Pause upload"}).click()
	await expect(p.locator(".status-text")).toHaveText("30% — Paused")
	await expect(page.locator("#up .footer-action-button")).toHaveText(["Pause all", "Resume all"])
	await p.getByRole("button", {name: "Resume upload"}).click()
	await expect(p.locator(".status-text")).toHaveText("30% — Uploading")

	const q = row(page, "up", "q.txt")
	await q.getByRole("button", {name: "Cancel upload"}).click()
	await expect(q.locator(".status-text")).toHaveText("⊘ Cancelled")
	await expect(q.getByRole("button", {name: "Retry upload"})).toBeVisible()

	await page.locator("#up .footer-action-button", {hasText: "Pause all"}).click()
	await expect(p.locator(".status-text")).toHaveText("30% — Paused")
	await page.locator("#up .footer-action-button", {hasText: "Resume all"}).click()
	await expect(p.locator(".status-text")).toHaveText("30% — Uploading")
	await finish(page, "p.txt")
	await expect(p.locator(".status-text")).toHaveText("✓ Completed")
})

test("validation rows, dedupe, count limit, validity and show more / less", async ({page}) => {
	const input = page.locator("#rej input[type=file]")
	await input.setInputFiles([file("ok.txt")])
	await expect(page.locator("#rej .file-count")).toHaveText("1 file")
	// rejectionMode "list" (default) lists every rejection as an error row.
	await input.setInputFiles([file("ok.txt"), file("big.txt", 50), file("bad.bin", 5, "application/octet-stream")])
	await expect(page.locator("#rej .file-count")).toHaveText("4 files")
	// maxVisibleFileCount=2 → the rest hide behind "Show 2 more".
	await expect(page.locator("#rej .file-item")).toHaveCount(2)
	await expect(page.locator("#rej .show-more-toggle")).toHaveText("Show 2 more")
	await expect(page.locator("#rej .file-item").nth(1).locator(".status-text")).toHaveText("✗ Duplicate file")
	await page.locator("#rej .show-more-toggle").click()
	await expect(page.locator("#rej .file-item")).toHaveCount(4)
	await expect(row(page, "rej", "big.txt").locator(".status-text")).toHaveText("✗ File size exceeds 10 Bytes")
	await expect(row(page, "rej", "bad.bin").locator(".status-text")).toHaveText("✗ File type not accepted. Accepted: .txt,image/*")
	await expect(page.locator("#rej .show-more-toggle")).toHaveText("Show less")
	await expect(page.locator("#rej-validity")).toHaveText("false:1")

	// Count cap (5): only one more fits, the overflow is rejected first.
	await input.setInputFiles([file("m1.txt"), file("m2.txt")])
	await expect(page.locator("#rej .file-count")).toHaveText("6 files")
	await expect(row(page, "rej", "m2.txt").locator(".status-text")).toHaveText("✗ Maximum 5 files allowed")
	await expect(row(page, "rej", "m1.txt").locator(".status-text")).toHaveText("Pending")
	await expect(page.locator("#rej-validity")).toHaveText("false:2")

	// Keyboard Delete on a row removes it.
	await row(page, "rej", "big.txt").focus()
	await page.keyboard.press("Delete")
	await expect(page.locator("#rej .file-count")).toHaveText("5 files")
	await page.locator("#rej .text-button", {hasText: "Clear all"}).click()
	await expect(page.locator("#rej .file-list")).toHaveCount(0)
	await expect(page.locator("#rej-validity")).toHaveText("true:0")
})

test("chips list: chips with +N toggle, chip remove, button selector", async ({page}) => {
	const chips = page.locator("#chips")
	await expect(chips.locator("fluent-button")).toHaveText("Select files")
	await chips.locator("input[type=file]").setInputFiles([file("1.txt"), file("2.txt"), file("3.txt")])
	await expect(chips.locator(".chips-row")).toHaveAttribute("data-chips-position", "bottom")
	await expect(chips.locator(".chip:not(.chip-more)")).toHaveCount(2)
	await chips.locator(".chip-more").click()
	await expect(chips.locator(".chip:not(.chip-more)")).toHaveCount(3)
	await expect(chips.locator(".chip-more")).toHaveText("−")
	await chips.locator(".chip", {hasText: "2.txt"}).getByRole("button", {name: "Remove 2.txt"}).click()
	await expect(chips.locator(".chip-name")).toHaveText(["1.txt", "3.txt"])
	await expect(chips.locator(".file-list")).toHaveCount(0)
})

test("manual upload: Upload all, chunked uploads, reorder by drag, empty snippet", async ({page}) => {
	const m = page.locator("#manual")
	await expect(page.locator("#manual-empty")).toHaveText("Nothing yet")
	await m.locator("input[type=file]").setInputFiles([file("x.txt", 10), file("y.txt", 3)])
	await expect(page.locator("#manual-empty")).toHaveCount(0)
	await expect(m.locator(".status-text")).toHaveText(["Pending", "Pending"])

	// Reorder: drag y above x.
	await row(page, "manual", "y.txt").dragTo(row(page, "manual", "x.txt"))
	await expect(m.locator(".file-name")).toHaveText(["y.txt", "x.txt"])

	await m.locator(".text-button", {hasText: "Upload all"}).click()
	// y (3 B) fits one chunk → controlled upload; x (10 B) goes in 4-byte chunks.
	await expect.poll(() => pendingUploads(page)).toEqual(["y.txt"])
	await finish(page, "y.txt")
	await expect(page.locator("#chunks")).toHaveText("0+4/10 4+4/10 8+2/10")
	await expect(m.locator(".status-text")).toHaveText(["✓ Completed", "✓ Completed"])
	await expect(m.locator(".text-button", {hasText: "Upload all"})).toHaveCount(0)
})

test("custom fileItem / actions snippets and formatLimits hint; card keyboard opens the picker", async ({page}) => {
	const s = page.locator("#snips")
	await expect(s.locator(".drop-zone")).toHaveClass(/drop-zone--small/)
	await expect(s.locator(".drop-zone-hint")).toHaveText(["0 of 10"])
	await s.locator("input[type=file]").setInputFiles([file("one.txt"), file("two.txt")])
	await expect(s.locator(".custom-row")).toHaveText(["one.txt:pending x", "two.txt:pending x"])
	await expect(s.locator(".drop-zone-hint")).toHaveText(["2 of 10"])
	await s.locator(".custom-row", {hasText: "one.txt"}).locator(".custom-remove").click()
	await expect(s.locator(".custom-row")).toHaveText(["two.txt:pending x"])
	await page.locator("#snips-clear").click()
	await expect(s.locator(".custom-row")).toHaveCount(0)

	const chooser = page.waitForEvent("filechooser")
	await s.locator(".drop-zone").focus()
	await page.keyboard.press("Enter")
	expect((await chooser).isMultiple()).toBe(true)
})

test("expandOnDrag overlay: highlights on dragenter, a drop adds the files and closes it", async ({page}) => {
	await page.evaluate(() => {
		const dt = new DataTransfer()
		dt.items.add(new File(["x"], "x.txt", {type: "text/plain"}))
		document.body.dispatchEvent(new DragEvent("dragenter", {bubbles: true, dataTransfer: dt}))
	})
	const overlay = page.locator(".drag-overlay")
	await expect(overlay).toHaveCount(1)
	// Centred on the card selector and at least as large.
	const card = (await page.locator("#ov .drop-zone").boundingBox())!
	const box = (await overlay.boundingBox())!
	expect(Math.abs(box.x + box.width / 2 - (card.x + card.width / 2))).toBeLessThan(2)
	expect(box.width).toBeGreaterThanOrEqual(card.width - 1)
	await expect(overlay.locator(".drop-zone-text")).toHaveText("Drag and drop files here, or")
	await overlay.dispatchEvent("dragenter")
	await expect(overlay).toHaveClass(/dragging/)
	await expect(overlay.locator(".drop-zone-text")).toHaveText("Drop files here")
	await page.evaluate(() => {
		const dt = new DataTransfer()
		dt.items.add(new File(["hello"], "dropped.txt", {type: "text/plain"}))
		document.querySelector(".drag-overlay")!.dispatchEvent(new DragEvent("drop", {bubbles: true, cancelable: true, dataTransfer: dt}))
	})
	await expect(overlay).toHaveCount(0)
	await expect(page.locator("#ov .file-name")).toHaveText(["dropped.txt"])
})
