// Internal (MultiSplitter): one gutter pointer-drag session — rebalance, snap-into-rail, drag-out-of-rail. Not exported from the package.

import type {PaneHandle} from "../../../types/multi-splitter.js"
import type {MultiSplitterEngine} from "./splitter.svelte.js"
import {settlePrimary, snapThreshold} from "./size-math.js"

const TAP_PX = 2

export class GutterDrag {
	private activePointerId: number | null = null
	private dragGutterIdx = -1
	private dragStartCoord = 0
	private dragStartPrimary = 0
	private primaryIdx = -1
	private primarySign = 1
	private primaryStartedMin = false
	private primaryInEscape = false
	private primaryCanSnap = false
	private primaryMaxReached = 0
	private everMoved = false
	private pendingMove: number | null = null
	private rafScheduled = false

	constructor(private readonly s: MultiSplitterEngine) {}

	private snapThreshold(anchor: number): number {
		return snapThreshold(anchor, this.s.opts.railSize, this.s.opts.minimizeThreshold)
	}

	private processMove = () => {
		const s = this.s
		this.rafScheduled = false
		if (this.pendingMove == null) return
		const coord = this.pendingMove
		this.pendingMove = null
		const primaryIdx = this.primaryIdx
		const primary = s.internal(primaryIdx)
		const primaryHandle = s.panes[primaryIdx]
		const delta = coord - this.dragStartCoord
		let newPrimary = this.dragStartPrimary + (this.primarySign * delta)

		// SNAP-INTO-RAIL: only after primary committed to expanded (snap gate).
		// Skipped once railed — further frames under the threshold must not
		// re-snap (and re-fire onPaneCollapse); it fires once per collapse.
		if (primary.canMin && this.primaryCanSnap && !primaryHandle.state.isMin) {
			if (newPrimary < this.snapThreshold(this.primaryMaxReached) && s.nonMinCount() > 1) {
				s.log("SNAP-INTO-RAIL primary=" + primaryIdx)
				const absorbers = s.computeAbsorbers(this.dragGutterIdx, primaryIdx)
				primaryHandle.state.isMin = true
				primary.size = s.opts.railSize
				s.clamp(s.totalAvailable(), s.pinnedForAbsorbers(absorbers))
				s.applySizes({persist: false})
				s.opts.onPaneCollapse?.({paneIndex: primaryIdx, pane: primary.el})
				return
			}
		}

		// DRAG-OUT-OF-RAIL: snapped mid-drag, user dragged back past threshold.
		// Gated by !primaryStartedMin: if primary was railed BEFORE the drag began,
		// the user must dblclick (or click the rail body) to expand it — drag won't.
		if (!this.primaryStartedMin && primaryHandle.state.isMin && newPrimary >= this.snapThreshold(this.primaryMaxReached)) {
			s.log("DRAG-OUT-OF-RAIL primary=" + primaryIdx)
			primaryHandle.state.isMin = false
			this.primaryInEscape = true
			s.opts.onPaneExpand?.({paneIndex: primaryIdx, pane: primary.el})
		}

		// While still railed, this frame is a no-op — skip floor/max/rebalance
		// so the cursor in the snap zone doesn't re-clamp primary up to min.
		if (primaryHandle.state.isMin) return

		const floor = ((this.primaryStartedMin && !this.primaryCanSnap) || this.primaryInEscape) ? s.opts.railSize : primary.min
		if (newPrimary < floor) newPrimary = floor
		if (newPrimary > primary.max) newPrimary = primary.max

		if (this.primaryInEscape && newPrimary >= primary.min) this.primaryInEscape = false
		if (!this.primaryCanSnap && newPrimary >= primary.min) this.primaryCanSnap = true
		if (newPrimary > this.primaryMaxReached) this.primaryMaxReached = newPrimary

		primary.size = newPrimary
		const total = s.totalAvailable()
		const absorbers = s.computeAbsorbers(this.dragGutterIdx, primaryIdx)
		s.clamp(total, s.pinnedForAbsorbers(absorbers))

		// Post-check: if absorbers couldn't absorb fully, pull primary back
		// by the overshoot so the layout fits.
		settlePrimary(s.sizedPanes(), primary, total, floor)
		s.applySizes({persist: false})
	}

	private onWindowPointerMove = (e: PointerEvent) => {
		const s = this.s
		if (e.pointerId !== this.activePointerId) return
		const delta = e[s.clientCoord] - this.dragStartCoord
		if (!this.everMoved && Math.abs(delta) >= TAP_PX) {
			this.everMoved = true
		}
		// Asymmetric drag against an already-railed primary:
		//   inward  (would shrink primary) → no-op, pane stays railed.
		//   outward (would grow  primary) → release rail, drag grows the pane.
		// `primarySign * delta > 0` is the outward direction (matches the
		// formula in processMove: newPrimary = dragStartPrimary + primarySign*delta).
		if (this.primaryStartedMin && s.panes[this.primaryIdx]?.state.isMin) {
			if (this.primarySign * delta <= 0) return
			if (Math.abs(delta) < TAP_PX) return
			const handle = s.panes[this.primaryIdx]
			handle.state.isMin = false
			const primary = s.internals.get(handle)!
			s.opts.onPaneExpand?.({paneIndex: this.primaryIdx, pane: primary.el})
		}
		this.pendingMove = e[s.clientCoord]
		if (this.rafScheduled) return
		this.rafScheduled = true
		requestAnimationFrame(this.processMove)
	}

	private onWindowPointerUp = (e: PointerEvent) => {
		const s = this.s
		if (e.pointerId !== this.activePointerId) return
		// Flush pending rAF so a last-millisecond move doesn't fire after we
		// make end-of-drag decisions.
		if (this.rafScheduled && this.pendingMove != null) this.processMove()
		this.rafScheduled = false
		this.pendingMove = null

		const primary = s.internals.get(s.panes[this.primaryIdx])
		const primaryHandle = s.panes[this.primaryIdx]
		const gut = s.internals.get(s.panes[this.dragGutterIdx])?.getGutterEl()
		try { gut?.releasePointerCapture(e.pointerId) } catch { /* */ }
		this.activePointerId = null
		s.rootEl?.classList.remove("fluent-multi-splitter--dragging")
		gut?.classList.remove("fluent-multi-splitter-gutter--active")
		this.removeWindowListeners()

		// (Tap-restore on the gutter is intentionally NOT implemented — a press
		// without drag does nothing on the gutter itself. To expand a railed
		// pane: dblclick the gutter, drag past the jitter threshold, or click
		// the rail pane body (handlePaneClick in MultiSplitterPane).
		// pa-splitter's TAP-RESTORE was here but the UX was surprising —
		// users expected drag-to-be-explicit.)

		// RAIL-STAYED: started rail, never grew above rail → restore isMin.
		let anyChange = false
		if (primary && primaryHandle && this.primaryStartedMin && Math.abs(primary.size - s.opts.railSize) < 1 && !primaryHandle.state.isMin) {
			s.log("RAIL-STAYED primary=" + this.primaryIdx)
			primaryHandle.state.isMin = true
			anyChange = true
		}

		// CLAMP-TO-MIN: any non-rail pane below its min gets bumped; remainder
		// redistributed across all non-rail panes.
		let anyBelowMin = false
		for (const h of s.panes) {
			const p = s.internals.get(h)!
			if (!h.state.isMin && p.size < p.min - 0.5) { anyBelowMin = true; break }
		}
		if (anyBelowMin) {
			s.log("CLAMP-TO-MIN")
			for (const h of s.panes) {
				const p = s.internals.get(h)!
				if (!h.state.isMin && p.size < p.min) p.size = p.min
			}
			s.clamp(s.totalAvailable(), s.isMinFlags())
			s.applySizes({persist: false})
		} else if (anyChange) {
			s.applySizes({persist: false})
		}
		this.cleanup()
		s.writeStorage()
	}

	private cleanup() {
		this.primaryStartedMin = false
		this.primaryInEscape = false
		this.primaryCanSnap = false
		this.primaryMaxReached = 0
		this.primaryIdx = -1
		this.dragGutterIdx = -1
	}

	start(e: PointerEvent, handle: PaneHandle) {
		const s = this.s
		if (e.button != null && e.button !== 0) return
		const g = s.panes.indexOf(handle)
		if (g < 0 || g >= s.panes.length - 1) return

		// Defensive sweep: clear --active from every gutter before claiming this one.
		for (const h of s.panes) {
			const gel = s.internals.get(h)!.getGutterEl()
			gel?.classList.remove("fluent-multi-splitter-gutter--active")
		}

		this.dragGutterIdx = g
		this.primaryIdx = s.primaryNeighbour(g)
		this.primarySign = (this.primaryIdx === g) ? 1 : -1
		const primary = s.internal(this.primaryIdx)
		const primaryHandle = s.panes[this.primaryIdx]
		this.primaryStartedMin = primaryHandle.state.isMin
		// If primary started railed, onWindowPointerMove only releases `isMin`
		// when the drag goes outward (would grow the pane). Inward drag is
		// fully inert — the rail stays put and the gutter doesn't move.
		// Dblclick / rail body click still work as alternative expand gestures.
		this.primaryInEscape = false
		this.primaryCanSnap = !this.primaryStartedMin
		this.everMoved = false
		this.activePointerId = e.pointerId
		this.dragStartCoord = e[s.clientCoord]
		this.dragStartPrimary = primary.size
		this.primaryMaxReached = this.dragStartPrimary

		s.log("pointerdown gutter=" + g + " primary=" + this.primaryIdx + " sign=" + this.primarySign)

		const gut = s.internals.get(handle)!.getGutterEl()
		try { gut?.setPointerCapture(e.pointerId) } catch { /* iOS */ }
		s.rootEl?.classList.add("fluent-multi-splitter--dragging")
		gut?.classList.add("fluent-multi-splitter-gutter--active")
		// Listen on window — pointermove can leave the gutter element during
		// fast drags, especially when crossing iframe boundaries.
		window.addEventListener("pointermove", this.onWindowPointerMove)
		window.addEventListener("pointerup", this.onWindowPointerUp)
		window.addEventListener("pointercancel", this.onWindowPointerUp)
		e.preventDefault()
	}

	private removeWindowListeners() {
		window.removeEventListener("pointermove", this.onWindowPointerMove)
		window.removeEventListener("pointerup", this.onWindowPointerUp)
		window.removeEventListener("pointercancel", this.onWindowPointerUp)
	}

	/** Unmounted mid-drag: drop the window listeners the drag installed and
	 * make a still-scheduled processMove() frame a no-op. */
	destroy() {
		this.pendingMove = null
		this.removeWindowListeners()
	}
}
