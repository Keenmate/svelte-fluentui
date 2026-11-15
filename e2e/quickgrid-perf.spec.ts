import {test, expect, type Page} from "@playwright/test"

/**
 * QuickGrid performance: 2,000 rows × 8 columns (display callbacks on four).
 * Fixture: docs/src/routes/test/quickgrid-perf/+page.svelte
 *
 * The timing test only runs with QG_PERF=1 (numbers vary by machine; it prints, never asserts):
 *   QG_PERF=1 npx playwright test e2e/quickgrid-perf.spec.ts --reporter=line
 * Each number is the median of 5: performance.now() from the action until the frame after it
 * (requestAnimationFrame → setTimeout), so script + style + layout are included; `scriptMs` is
 * the part until Svelte's flush has run (a posted message); `callbackCalls` counts the
 * fixture's getDisplayValueCallback calls during the action.
 */

const ROWS = 2000

/** Runs `action` in the page and resolves the ms until the next frame has been produced. */
async function timed(page: Page, action: string, arg?: unknown): Promise<{ms: number; script: number; calls: number}> {
	return page.evaluate(async ([action, arg]) => {
		const w = window as unknown as {__qgDisplayCalls: number}
		const callsBefore = w.__qgDisplayCalls
		const t0 = performance.now()
		if (action === "mount") {
			(document.querySelector("#perf-mount") as HTMLButtonElement).click()
		} else if (action === "filter") {
			const [index, term] = arg as [number, string]
			const input = document.querySelectorAll<HTMLInputElement>("#perf-wrap .filter-input")[index]
			input.value = term
			input.dispatchEvent(new Event("input", {bubbles: true}))
		} else if (action === "sort") {
			const buttons = document.querySelectorAll<HTMLButtonElement>("#perf-wrap .column-sort-button")
			buttons[arg as number].click()
		}
		// Script: Svelte flushes in a microtask, so a posted message runs after it (before rendering).
		await new Promise<void>((resolve) => {
			const channel = new MessageChannel()
			channel.port1.onmessage = () => resolve()
			channel.port2.postMessage(null)
		})
		const script = performance.now() - t0
		await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
		return {ms: performance.now() - t0, script, calls: w.__qgDisplayCalls - callsBefore}
	}, [action, arg] as const)
}

const round = (x: number) => Math.round(x * 10) / 10
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

async function mount(page: Page, rows = ROWS, virtualize = false) {
	await page.goto(`/test/quickgrid-perf?rows=${rows}${virtualize ? "&virtualize" : ""}`)
	await expect(page.locator("#perf-row-count")).toHaveText(String(rows))
}

const bodyRows = (page: Page) => page.locator("#perf-wrap tbody tr[data-row-key]")

/** Displayed row count: the rendered rows, or (virtualised) aria-rowcount minus the 2 header rows. */
async function expectRows(page: Page, count: number, virtualize: boolean) {
	if (virtualize) await expect(page.locator("#perf-wrap table")).toHaveAttribute("aria-rowcount", String(count + 2))
	else await expect(bodyRows(page)).toHaveCount(count)
}

test.describe("QuickGrid perf fixture", () => {
	// Smoke (always runs; small, so it doesn't load the parallel suite).
	test("renders, filters and sorts", async ({page}) => {
		const rows = 300
		await mount(page, rows)
		await page.locator("#perf-mount").click()
		await expect(bodyRows(page)).toHaveCount(rows)
		// City (index 2) filters on the display text, diacritics folded: "zur" → Zürich
		await page.locator("#perf-wrap .filter-input").nth(2).fill("zur")
		await expect(bodyRows(page)).toHaveCount(rows / 6)
		await page.locator("#perf-wrap .filter-input").nth(2).fill("")
		await expect(bodyRows(page)).toHaveCount(rows)
		await page.locator("#perf-wrap .column-sort-button").nth(0).click()
		await page.locator("#perf-wrap .column-sort-button").nth(0).click()
		await expect(bodyRows(page).first().locator(".cell-text").first()).toHaveText(String(rows))
	})

	for (const virtualize of [false, true]) {
		test(`timings${virtualize ? ", virtualize" : ""} (QG_PERF=1)`, async ({page}) => {
			test.skip(!process.env.QG_PERF, "set QG_PERF=1 to measure")
			test.setTimeout(240_000)
			const results: Record<string, {ms: number[]; script: number[]; calls: number[]}> = {}
			const record = (name: string, r: {ms: number; script: number; calls: number}) => {
				results[name] ??= {ms: [], script: [], calls: []}
				results[name].ms.push(r.ms)
				results[name].script.push(r.script)
				results[name].calls.push(r.calls)
			}

			for (let i = 0; i < 5; i++) {
				await mount(page, ROWS, virtualize)
				record("initial render", await timed(page, "mount"))
				await expectRows(page, ROWS, virtualize)
			}

			// Keystrokes that keep every row (score "N pts"): the pipeline cost without DOM churn.
			const steady = ["p", "pt", "pts", "pt", "p"]
			for (const term of steady) record("filter keystroke (all rows match)", await timed(page, "filter", [7, term]))
			await page.locator("#perf-wrap .filter-input").nth(7).fill("")
			await expectRows(page, ROWS, virtualize)

			// A narrowing keystroke on a display-callback column (2,000 → 333 rows), then back.
			for (let i = 0; i < 5; i++) {
				record("filter keystroke (narrowing to 1/6)", await timed(page, "filter", [2, "zur"]))
				await expectRows(page, ROWS / 6 | 0, virtualize)
				record("filter keystroke (clearing back)", await timed(page, "filter", [2, ""]))
				await expectRows(page, ROWS, virtualize)
			}

			// Sort clicks on City (display callback; sorted by raw value): asc, desc, none, …
			for (let i = 0; i < 5; i++) record("sort click", await timed(page, "sort", 2))

			const summary = Object.fromEntries(Object.entries(results).map(([name, r]) =>
				[name, {medianMs: round(median(r.ms)), scriptMs: round(median(r.script)), samplesMs: r.ms.map(Math.round), callbackCalls: median(r.calls)}]))
			for (const [name, r] of Object.entries(summary)) console.log(`QG_PERF${virtualize ? " virtualize" : ""} ${name}: ${JSON.stringify(r)}`)
		})
	}
})
