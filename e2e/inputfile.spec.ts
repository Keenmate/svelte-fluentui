import {test, expect} from "@playwright/test"

/**
 * InputFile (2.0.0): uploadCallback({file, signal, reportProgress}) and ctx events
 * onFileAdd / onFileUpload / onFileError / onUploadComplete / onFileRemove.
 * Fixture: docs/src/routes/test/inputfile/+page.svelte
 */

test("upload flow fires the ctx events in order", async ({page}) => {
	await page.goto("/test/inputfile")
	await page.locator("#if input[type=file]").setInputFiles([
		{name: "small.txt", mimeType: "text/plain", buffer: Buffer.from("hello")},
		{name: "big.txt", mimeType: "text/plain", buffer: Buffer.alloc(500, 65)}
	])
	const log = page.locator("#if-log")
	await expect(log).toContainText("error:big.txt:yes")
	await expect(log).toContainText("add:small.txt")
	await expect(log).toContainText("upload:small.txt@0:small.txt")
	await expect(log).toContainText("complete:1")
	await page.locator("#remove-first").click()
	await expect(log).toContainText("remove:small.txt")
})
