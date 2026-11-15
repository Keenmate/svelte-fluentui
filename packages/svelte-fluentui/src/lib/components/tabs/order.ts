// Internal (Tabs): pure tab ordering / navigation — display order, overflow swap, keyboard and swipe targets. Not exported from the package.

import type {TabEntry} from "./tabs.types.js"

/*
 * `displayOrder` is a custom-ordering layer on top of the source
 * (registration) order. Empty means "use source order as-is". Hidden
 * (`visible === false`) tabs are dropped; tabs `displayOrder` doesn't know
 * about yet are appended.
 */
export function orderTabs(tabs: TabEntry[], displayOrder: string[]): TabEntry[] {
	const filtered = tabs.filter(t => t.visible !== false)
	if (displayOrder.length === 0) return filtered
	const byId = new Map(filtered.map(t => [t.id, t]))
	const seen = new Set<string>()
	const result: TabEntry[] = []
	for (const id of displayOrder) {
		const tab = byId.get(id)
		if (tab) {
			result.push(tab)
			seen.add(id)
		}
	}
	// Append newly-registered tabs that displayOrder doesn't know about yet.
	for (const tab of filtered) {
		if (!seen.has(tab.id)) result.push(tab)
	}
	return result
}

/*
 * Swap UX (menu mode): the picked tab trades places with the last-visible
 * tab so it stays in the strip. Returns the new order, or null when no swap
 * is needed (unknown tab, or it already sits in the last visible slot).
 */
export function swapIntoStrip(currentOrder: string[], tabId: string, visibleCount: number): string[] | null {
	const selectedIdx = currentOrder.indexOf(tabId)
	const lastVisibleIdx = Math.max(0, Math.min(visibleCount - 1, currentOrder.length - 1))
	if (selectedIdx < 0 || selectedIdx === lastVisibleIdx) return null
	const next = [...currentOrder]
	;[next[selectedIdx], next[lastVisibleIdx]] = [next[lastVisibleIdx], next[selectedIdx]]
	return next
}

/**
 * Keyboard target for `key` from the active tab: next/prev step (wrapping),
 * Home/End jump to the first/last enabled tab. Returns the target tab, null
 * when the key isn't a navigation key (or nothing is active), and undefined
 * when it is one but every other tab is disabled.
 */
export function keyboardTarget(
	tabs: TabEntry[],
	activeId: string | undefined,
	key: string,
	prevKey: string,
	nextKey: string
): TabEntry | null | undefined {
	if (tabs.length === 0) return null
	const idx = tabs.findIndex(t => t.id === activeId)
	if (idx < 0) return null
	let targetIdx = idx
	let step = 0

	if (key === nextKey) step = 1
	else if (key === prevKey) step = -1
	else if (key === "Home") { targetIdx = -1; step = 1 }
	else if (key === "End") { targetIdx = tabs.length; step = -1 }
	else return null

	// Step until we find a non-disabled tab or loop back to start.
	const total = tabs.length
	for (let guard = 0; guard < total; guard++) {
		targetIdx = (targetIdx + step + total) % total
		if (!tabs[targetIdx].disabled) return tabs[targetIdx]
	}
	return undefined
}

/** Nearest enabled tab in `direction` from the active one (no wrap-around), or null. */
export function adjacentEnabledTab(tabs: TabEntry[], activeId: string | undefined, direction: 1 | -1): TabEntry | null {
	if (tabs.length === 0) return null
	const currentIdx = tabs.findIndex(t => t.id === activeId)
	if (currentIdx < 0) return null
	for (let i = currentIdx + direction; i >= 0 && i < tabs.length; i += direction) {
		if (!tabs[i].disabled) return tabs[i]
	}
	return null
}
