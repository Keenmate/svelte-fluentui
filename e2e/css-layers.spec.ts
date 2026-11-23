import {expect, test} from "@playwright/test"

// Library CSS lives in `@layer reset, variables, component, overrides` (code-analysis/2.0.0/08-css-layers-reboot.md).
// Guards: a component <style> without the layer wrapper would beat every layered rule (and every
// layered library on the consumer's page); a wrong first layer statement would reorder them; an
// `!important` inside a layer beats the app's own `!important`, so the app could never override it.

test("every library style rule is layered, in the suite's order, without !important", async ({page}) => {
	await page.goto("/components/badge")
	await page.waitForLoadState("networkidle")
	const result = await page.evaluate(() => {
		const unlayered: string[] = []
		const important: string[] = []
		let firstOrder: string | null = null
		const isLibrary = (src: string) =>
			src.includes("/packages/svelte-fluentui/src/lib/") || src.includes("svelte-fluentui/dist/")
		const walk = (rules: CSSRuleList, inLayer: boolean, src: string) => {
			for (const rule of Array.from(rules)) {
				if (rule instanceof CSSLayerStatementRule) firstOrder ??= rule.nameList.join(",")
				else if (rule instanceof CSSLayerBlockRule) {
					firstOrder ??= rule.name
					walk(rule.cssRules, true, src)
				} else if (rule instanceof CSSStyleRule && isLibrary(src)) {
					for (const prop of Array.from(rule.style)) {
						if (rule.style.getPropertyPriority(prop) === "important") important.push(`${rule.selectorText} { ${prop} }`)
					}
					// native CSS nesting (`.a { & .b {} }`)
					if (rule.cssRules.length) walk(rule.cssRules, inLayer, src)
					if (inLayer) continue
					// vite-plugin-svelte appends an empty `.s-<hash>{}` marker in dev
					if (!(rule.style.length === 0 && /^\.s-[\w-]+$/.test(rule.selectorText)))
						unlayered.push(`${rule.selectorText} @ ${src}`)
				} else if ("cssRules" in rule && !(rule instanceof CSSLayerBlockRule))
					walk((rule as CSSGroupingRule).cssRules, inLayer, src)
			}
		}
		for (const sheet of Array.from(document.styleSheets)) {
			const node = sheet.ownerNode as HTMLElement | null
			const src = sheet.href ?? node?.dataset?.viteDevId ?? ""
			try {
				walk(sheet.cssRules, false, src.replaceAll("\\", "/"))
			} catch {
				// cross-origin sheet (fonts, CDN) — not ours
			}
		}
		return {unlayered, important, firstOrder}
	})
	expect(result.unlayered).toEqual([])
	expect(result.firstOrder).toBe("reset,variables,component,overrides")
	// Deliberate, must beat any app rule: the two-frame theme switch (theme.scss), the reboot's `[hidden]`
	// and datalist-indicator hides, and Option's filter hide (an app `.fluent-option { display: flex }`
	// would otherwise show filtered-out rows). Anything else: raise specificity (`:not(#_)`) instead.
	const allowed = /fluent-theme-switching|[hidden]|calendar-picker-indicator|data-filtered-out/
	expect(result.important.filter((rule) => !allowed.test(rule))).toEqual([])
})

test("an unlayered app rule beats a component's own style, whatever the specificity", async ({page}) => {
	await page.goto("/components/badge")
	const label = page.locator(".fluent-label").first()
	await expect(label).toBeVisible()
	const before = await label.evaluate((el) => getComputedStyle(el).fontWeight)
	expect(before).toBe("500")
	// A bare element selector (0,0,1) against Label's `.fluent-label.s-hash` (0,2,0)
	await page.addStyleTag({content: "span { font-weight: 900 }"})
	await expect.poll(() => label.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("900")
})
