// Internal (Tabs): swipe-to-navigate gesture tracking on the tab panels. Not exported from the package.

/*
 * Touch start/end pair; we measure the net displacement on touchend rather
 * than attempting to preview the swipe — that would require sliding-panel
 * animation and momentum handling that's out of scope for the MVP.
 *
 * The dominant-axis check (MIN_RATIO) is what keeps vertical content
 * scrolls from triggering tab changes: if the gesture has significant
 * perpendicular motion, we treat it as scroll, not swipe.
 *
 * Interactive-target check aborts the swipe if the touch originated
 * on an input/button/range/contenteditable so form controls keep
 * working — a horizontal drag on a <input type="range"> inside a panel
 * would otherwise steal the interaction and flip tabs instead.
 */
const SWIPE_THRESHOLD_PX = 50
const SWIPE_MIN_RATIO = 1.5

function isInteractiveSwipeTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	return !!target.closest(
		"input, textarea, select, button, a[href], [contenteditable='true'], [contenteditable=''], [role='slider'], [role='spinbutton']"
	)
}

export class SwipeTracker {
	private start: {x: number; y: number; aborted: boolean} | null = null

	onTouchStart(e: TouchEvent, enabled: boolean) {
		if (!enabled || e.touches.length !== 1) {
			this.start = null
			return
		}
		const t = e.touches[0]
		this.start = {
			x: t.clientX,
			y: t.clientY,
			aborted: isInteractiveSwipeTarget(e.target)
		}
	}

	/** Returns -1 (toward the previous tab), 1 (toward the next) or 0 (not a swipe). */
	onTouchEnd(e: TouchEvent, horizontal: boolean): -1 | 0 | 1 {
		const start = this.start
		this.start = null
		if (!start || start.aborted) return 0
		const t = e.changedTouches[0]
		const dx = t.clientX - start.x
		const dy = t.clientY - start.y
		const absDx = Math.abs(dx)
		const absDy = Math.abs(dy)

		if (horizontal) {
			if (absDx < SWIPE_THRESHOLD_PX) return 0
			if (absDx < absDy * SWIPE_MIN_RATIO) return 0
			return dx > 0 ? -1 : 1
		}
		if (absDy < SWIPE_THRESHOLD_PX) return 0
		if (absDy < absDx * SWIPE_MIN_RATIO) return 0
		return dy > 0 ? -1 : 1
	}

	cancel() {
		this.start = null
	}
}
