// Internal (Tabs): DOM measurement — menu-mode fit (shadow tablist), active indicator geometry, scroll-arrow state. Not exported from the package.

const MIN_TRUNCATED_TAB_SIZE = 60

/** Attribute selector for a tab button / shadow by id. */
export function cssIdSelector(tabId: string): string {
	return `[data-tab-id="${CSS.escape(tabId)}"]`
}

/*
 * Menu-mode measurement. The shadow tablist holds every tab at its
 * natural width in the same CSS layout, positioned off-screen with
 * visibility: hidden so it takes no visible space but provides stable
 * per-tab dimensions. We cumulative-sum those dimensions against the
 * real tablist's clientWidth/clientHeight and fix `visibleCount` —
 * when not everything fits, we also subtract the shadow `⋯` button's
 * size so the real overflow button has somewhere to sit.
 *
 * Measuring in a shadow pass (not the real tablist) is what breaks
 * the classic feedback loop where showing the overflow button would
 * shrink the tablist, change the overflow condition, hide the
 * button, restore the width, etc.
 *
 * `truncate` (px, 0 = none): when the last tab that would otherwise
 * overflow fits only *partially*, it stays as the last visible tab capped
 * to this size and the CSS ellipsises its label.
 */
export function measureVisibleCount(
	tablist: HTMLElement,
	shadowTablist: HTMLElement,
	horizontal: boolean
): {visibleCount: number; truncate: number} {
	const shadowBtns = Array.from(
		shadowTablist.querySelectorAll<HTMLElement>("[data-shadow-tab-id]")
	)
	const shadowMoreBtn = shadowTablist.querySelector<HTMLElement>("[data-shadow-more]")

	if (shadowBtns.length === 0) return {visibleCount: 0, truncate: 0}

	const containerSize = horizontal ? tablist.clientWidth : tablist.clientHeight
	const moreBtnSize = shadowMoreBtn
		? (horizontal ? shadowMoreBtn.offsetWidth : shadowMoreBtn.offsetHeight)
		: 40
	const sizes = shadowBtns.map(btn => horizontal ? btn.offsetWidth : btn.offsetHeight)
	return fitTabs(sizes, containerSize, moreBtnSize)
}

/** Pure part of {@link measureVisibleCount}: how many of `sizes` fit `containerSize`. */
export function fitTabs(sizes: number[], containerSize: number, moreBtnSize: number): {visibleCount: number; truncate: number} {
	// First pass: does everything fit without the `⋯` button at all?
	let cumulative = 0
	let fitAll = true
	for (const size of sizes) {
		cumulative += size
		if (cumulative > containerSize) {
			fitAll = false
			break
		}
	}
	if (fitAll) return {visibleCount: sizes.length, truncate: 0}

	/*
	 * Second pass: reserve space for the `⋯` button, then walk tabs.
	 *  - Tab fully fits → include at full width
	 *  - Tab doesn't fit but remaining space >= MIN_TRUNCATED_TAB_SIZE
	 *    → include the tab as the last visible, capped to the remaining
	 *    space; CSS handles the label ellipsis
	 *  - Tab doesn't fit and too little remaining → push to overflow
	 *
	 * This keeps partially-fitting tabs visible (and interactable)
	 * instead of collapsing them into the `⋯` menu just because the
	 * prior tabs happened to be wide.
	 */
	const available = Math.max(0, containerSize - moreBtnSize)
	cumulative = 0
	let fit = 0
	let truncate = 0
	for (const size of sizes) {
		if (cumulative + size > available) {
			const remaining = available - cumulative
			if (remaining >= MIN_TRUNCATED_TAB_SIZE) {
				fit++
				truncate = remaining
			}
			break
		}
		cumulative += size
		fit++
	}
	// Always show at least one tab if any are registered, even if the
	// first tab alone is wider than available — the single tab gets
	// truncated to `available`.
	if (fit === 0 && sizes.length > 0) {
		fit = 1
		truncate = available
	}
	return {visibleCount: fit, truncate}
}

/**
 * Inline style for the animated active indicator under (horizontal) /
 * beside (vertical) `activeBtn`; hidden when there's no button.
 *
 * Uses translate(x, y) on BOTH axes so the indicator tracks the active
 * tab's row/column in wrap mode — not just its horizontal (or vertical)
 * position. Without both axes, in a wrap-mode layout the indicator would
 * appear under the entire tablist's bottom edge even when the active tab
 * is on an earlier row.
 */
export function indicatorStyle(activeBtn: HTMLElement | null, horizontal: boolean, rtl: () => boolean): string {
	if (!activeBtn) return "opacity: 0;"
	const thickness = 2
	if (horizontal) {
		const x = activeBtn.offsetLeft
		const y = activeBtn.offsetTop + activeBtn.offsetHeight - thickness
		return `opacity: 1;` +
			`transform: translate(${x}px, ${y}px);` +
			`width: ${activeBtn.offsetWidth}px;` +
			`height: ${thickness}px;`
	}
	// The indicator sits on the tab's inline-end edge (facing the panels):
	// the right edge in LTR, the left edge in RTL.
	const x = rtl()
		? activeBtn.offsetLeft
		: activeBtn.offsetLeft + activeBtn.offsetWidth - thickness
	const y = activeBtn.offsetTop
	return `opacity: 1;` +
		`transform: translate(${x}px, ${y}px);` +
		`width: ${thickness}px;` +
		`height: ${activeBtn.offsetHeight}px;`
}

/**
 * Whether the tablist can scroll toward its start / end. RTL scrollLeft is
 * 0 at the start and goes negative toward the end, so the distance from the
 * start is its magnitude in both directions.
 */
export function scrollState(tablist: HTMLElement, horizontal: boolean): {canScrollStart: boolean; canScrollEnd: boolean} {
	if (horizontal) {
		const {clientWidth, scrollWidth} = tablist
		const scrolled = Math.abs(tablist.scrollLeft)
		return {
			canScrollStart: scrolled > 0,
			canScrollEnd: scrollWidth > clientWidth && scrolled + clientWidth < scrollWidth - 1
		}
	}
	const {scrollTop, clientHeight, scrollHeight} = tablist
	return {
		canScrollStart: scrollTop > 0,
		canScrollEnd: scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 1
	}
}
