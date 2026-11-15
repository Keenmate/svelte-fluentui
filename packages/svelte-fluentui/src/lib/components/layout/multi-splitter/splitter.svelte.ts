// Internal (MultiSplitter): pane registry + layout engine — sizing, minimize/restore, keyboard, accordion, init, resize observer. Not exported from the package.

import type {MultiSplitterContext, PaneHandle, PaneRegistration} from "../../../types/multi-splitter.js"
import type {Orientation} from "../../../types/index.js"
import {GutterDrag} from "./drag.js"
import {readSplitterState, writeSplitterState} from "./persistence.js"
import {
	clampToConstraints,
	computeAbsorbers,
	expandNonMinToFill,
	parseSize,
	pinnedForAbsorbers,
	primaryNeighbour,
	resolveMinMax,
	settlePrimary,
	type SizedPane
} from "./size-math.js"

export type MultiSplitterResizeDetail = {paneIndex: number; pane: HTMLElement; size: number}
export type MultiSplitterToggleDetail = {paneIndex: number; pane: HTMLElement}

/** Live view of the MultiSplitter props the engine reads (getters over `$props()`). */
export type SplitterOptions = {
	readonly orientation: Orientation
	readonly id: string | undefined
	readonly persistKey: string | undefined
	readonly step: number
	readonly railSize: number
	readonly minimizeThreshold: number
	readonly debug: boolean
	readonly onPaneResize: ((ctx: MultiSplitterResizeDetail) => void) | undefined
	readonly onPaneCollapse: ((ctx: MultiSplitterToggleDetail) => void) | undefined
	readonly onPaneExpand: ((ctx: MultiSplitterToggleDetail) => void) | undefined
}

// Class form so `state` can carry a `$state` field — Svelte 5 disallows
// `$state(...)` inside object literals, but allows it as a class field.
class PaneHandleImpl implements PaneHandle {
	id: number
	state = $state({isMin: false})
	constructor(id: number) { this.id = id }
}

// Per-handle non-reactive working state. Hot drag loop reads from here.
export type PaneInternal = SizedPane & {
	el: HTMLElement
	getGutterEl: () => HTMLElement | undefined
	canMin: boolean
	rawSize?: string
	rawMin?: string
	rawMax?: string
	lastNonZero: number
}

// Programmatic-reflow window length (see markReflow).
const REFLOW_MS = 250

export class MultiSplitterEngine {
	rootEl: HTMLDivElement | undefined = $state()
	panes: PaneHandle[] = $state([])
	readonly internals = new Map<PaneHandle, PaneInternal>()
	private accordionActive = false
	private nextHandleId = 0
	private readonly drag: GutterDrag
	private reflowTimer: ReturnType<typeof setTimeout> | null = null
	private initScheduled = false
	private initApplied = false
	private toggleListenerInstalled = false
	private resizeObserver: ResizeObserver | null = null

	constructor(readonly opts: SplitterOptions) {
		this.drag = new GutterDrag(this)
	}

	get isVertical(): boolean { return this.opts.orientation === "vertical" }
	get clientAxis(): "clientHeight" | "clientWidth" { return this.isVertical ? "clientHeight" : "clientWidth" }
	get clientCoord(): "clientX" | "clientY" { return this.isVertical ? "clientY" : "clientX" }

	log(...args: unknown[]) {
		if (!this.opts.debug) return
		console.log("[multi-splitter:" + (this.opts.persistKey || this.opts.id || "anon") + "]", ...args)
	}

	internal(i: number): PaneInternal { return this.internals.get(this.panes[i])! }
	sizedPanes(): PaneInternal[] { return this.panes.map(h => this.internals.get(h)!) }
	isMinFlags(): boolean[] { return this.panes.map(h => h.state.isMin) }

	writeStorage() {
		if (!this.opts.persistKey) return
		writeSplitterState(this.opts.persistKey, {
			sizes: this.panes.map(h => this.internals.get(h)!.size),
			lasts: this.panes.map(h => this.internals.get(h)!.lastNonZero),
			minimized: this.isMinFlags()
		})
	}

	private gapPx(): number {
		if (!this.rootEl) return 0
		const cs = getComputedStyle(this.rootEl)
		const raw = this.isVertical ? cs.rowGap : cs.columnGap
		const px = parseFloat(raw)
		return isNaN(px) ? 0 : px
	}

	private paddingPx(): number {
		if (!this.rootEl) return 0
		const cs = getComputedStyle(this.rootEl)
		const start = this.isVertical ? cs.paddingTop : cs.paddingLeft
		const end = this.isVertical ? cs.paddingBottom : cs.paddingRight
		return (parseFloat(start) || 0) + (parseFloat(end) || 0)
	}

	private gutterTotal(): number {
		// Sum across all rendered gutters (last pane has none). Reads measured
		// size so a per-instance --gutter-size override is honoured.
		let t = 0
		for (let i = 0; i < this.panes.length - 1; i++) {
			const g = this.internal(i).getGutterEl()
			if (g) t += g[this.clientAxis]
		}
		return t
	}

	totalAvailable(): number {
		if (!this.rootEl) return 0
		const N = this.panes.length
		// Flex `gap` lands between every adjacent child. Panes + gutters
		// alternate, so 2(N-1) boundaries.
		const gapCount = 2 * (N - 1)
		return this.rootEl[this.clientAxis] - this.paddingPx() - this.gutterTotal() - (gapCount * this.gapPx())
	}

	private resolveConstraints(): number {
		if (!this.rootEl) return 0
		const rootSize = this.rootEl[this.clientAxis]
		const total = this.totalAvailable()
		for (const h of this.panes) resolveMinMax(this.internals.get(h)!, rootSize, total)
		return total
	}

	clamp(total: number, pinned: boolean[]) {
		clampToConstraints(this.sizedPanes(), total, pinned)
	}

	// Programmatic-reflow window: panes shift under the resting cursor when
	// applySizes runs outside a drag — neutralise hover/selection flashes for
	// ~250 ms via the --reflowing class. Shared timer; later calls extend
	// the window rather than letting an earlier timer clear it too soon.
	private markReflow() {
		const root = this.rootEl
		if (!root) return
		if (root.classList.contains("fluent-multi-splitter--dragging")) return
		root.classList.add("fluent-multi-splitter--reflowing")
		if (this.reflowTimer != null) clearTimeout(this.reflowTimer)
		this.reflowTimer = setTimeout(() => {
			this.rootEl?.classList.remove("fluent-multi-splitter--reflowing")
			this.reflowTimer = null
		}, REFLOW_MS)
	}

	applySizes(opts: {persist?: boolean} = {}) {
		const N = this.panes.length
		for (let i = 0; i < N; i++) {
			const h = this.panes[i]
			const p = this.internals.get(h)!
			p.el.style.flexBasis = p.size + "px"
			// lastNonZero captures the last "expanded" size for restore. Only
			// trust values at or above the pane's min (so a drag-from-rail
			// that couldn't move the boundary doesn't overwrite the original
			// expanded width with the rail-floor value).
			if (p.size >= p.min && !h.state.isMin) {
				p.lastNonZero = p.size
			}
			// Fire onPaneResize when size changed materially. Pre-applySizes the
			// caller already wrote p.size; we don't track previous-frame
			// size, so fire unconditionally and let consumers debounce.
			this.opts.onPaneResize?.({paneIndex: i, pane: p.el, size: p.size})
		}

		// Update each gutter's ARIA. Uses left-pane size for valuenow.
		for (let g = 0; g < N - 1; g++) {
			const p = this.internal(g)
			const gut = p.getGutterEl()
			if (!gut) continue
			gut.setAttribute("aria-valuenow", String(Math.round(p.size)))
			gut.setAttribute("aria-valuemin", String(Math.round(p.min)))
			gut.setAttribute("aria-valuemax", String(Math.round(p.max)))
		}

		if (opts.persist !== false) this.writeStorage()
		this.markReflow()
	}

	nonMinCount(): number {
		let c = 0
		for (const h of this.panes) if (!h.state.isMin) c++
		return c
	}

	computeAbsorbers(g: number, primary: number): number[] {
		return computeAbsorbers(this.isMinFlags(), g, primary)
	}

	pinnedForAbsorbers(absorbers: number[]): boolean[] {
		return pinnedForAbsorbers(this.panes.length, absorbers)
	}

	primaryNeighbour(g: number): number {
		return primaryNeighbour(g, this.panes.length,
			() => !!this.rootEl && getComputedStyle(this.rootEl).direction === "rtl")
	}

	// ---------- Gutter / pane interaction ----------
	private handleGutterKeydown(e: KeyboardEvent, handle: PaneHandle) {
		const g = this.panes.indexOf(handle)
		if (g < 0 || g >= this.panes.length - 1) return
		const step = this.opts.step
		switch (e.key) {
			case "ArrowLeft":
			case "ArrowUp":
				this.shiftPrimary(g, -step); e.preventDefault(); break
			case "ArrowRight":
			case "ArrowDown":
				this.shiftPrimary(g, step); e.preventDefault(); break
			case "Home": {
				const p = this.primaryNeighbour(g)
				this.setPrimaryTo(g, this.internal(p).min); e.preventDefault(); break
			}
			case "End": {
				const p = this.primaryNeighbour(g)
				this.setPrimaryTo(g, this.internal(p).max); e.preventDefault(); break
			}
			case "Enter":
			case " ": {
				this.toggleAdjacent(g)
				e.preventDefault(); break
			}
		}
	}

	private handleGutterDblClick(e: MouseEvent, handle: PaneHandle) {
		const g = this.panes.indexOf(handle)
		if (g < 0 || g >= this.panes.length - 1) return
		e.preventDefault()
		this.toggleAdjacent(g)
	}

	/** Toggle the primary neighbour of gutter `g` if minimizable, else the other one. */
	private toggleAdjacent(g: number) {
		const p = this.primaryNeighbour(g)
		const other = p === g ? g + 1 : g
		if (this.internal(p).canMin) this.togglePane(p)
		else if (this.internal(other).canMin) this.togglePane(other)
	}

	private handlePaneClick(_e: MouseEvent, handle: PaneHandle) {
		// Click on a railed pane → restore. Click on an expanded pane is a no-op
		// here (consumers can listen to onclick on their own content normally).
		const i = this.panes.indexOf(handle)
		if (i < 0) return
		if (handle.state.isMin) {
			this.log("rail click i=" + i)
			this.restorePane(i)
		}
	}

	private shiftPrimary(g: number, gutterDelta: number) {
		const primary = this.primaryNeighbour(g)
		const primaryHandle = this.panes[primary]
		if (primaryHandle.state.isMin) return
		const sign = (primary === g) ? 1 : -1
		this.setPrimaryTo(g, this.internals.get(primaryHandle)!.size + sign * gutterDelta)
	}

	private setPrimaryTo(g: number, newSize: number) {
		const primary = this.primaryNeighbour(g)
		const primaryHandle = this.panes[primary]
		if (primaryHandle.state.isMin) return
		const p = this.internals.get(primaryHandle)!
		let target = newSize
		if (target < p.min) target = p.min
		if (target > p.max) target = p.max
		p.size = target
		const total = this.totalAvailable()
		this.clamp(total, this.pinnedForAbsorbers(this.computeAbsorbers(g, primary)))
		settlePrimary(this.sizedPanes(), p, total, p.min)
		this.applySizes()
	}

	private minimizePane(i: number) {
		const handle = this.panes[i]
		const p = this.internals.get(handle)!
		if (!p.canMin || handle.state.isMin) return
		if (this.nonMinCount() <= 1) return
		this.log("minimizePane i=" + i)
		handle.state.isMin = true
		p.size = this.opts.railSize
		this.clamp(this.totalAvailable(), this.isMinFlags())
		this.applySizes()
		this.opts.onPaneCollapse?.({paneIndex: i, pane: p.el})
	}

	private restorePane(i: number) {
		const handle = this.panes[i]
		const p = this.internals.get(handle)!
		if (!handle.state.isMin) return
		const railSize = this.opts.railSize
		// ACCORDION SWEEP: in accordion mode, restoring one auto-rails the
		// other minimizable panes so exactly one stays open.
		if (this.accordionActive) {
			for (let j = 0; j < this.panes.length; j++) {
				if (j !== i) {
					const hj = this.panes[j]
					const pj = this.internals.get(hj)!
					if (pj.canMin && !hj.state.isMin) {
						hj.state.isMin = true
						pj.size = railSize
						this.opts.onPaneCollapse?.({paneIndex: j, pane: pj.el})
					}
				}
			}
		}
		handle.state.isMin = false
		// Target: remembered size, never below min. Compute floor first so
		// the deficit math reflects the actual restore amount.
		let target = p.lastNonZero > 0 ? p.lastNonZero : Math.max(p.min, railSize * 4)
		if (target < p.min) target = p.min
		const total = this.totalAvailable()
		let currentSum = 0
		let fromOthers = 0
		for (let j = 0; j < this.panes.length; j++) {
			const pj = this.internal(j)
			currentSum += pj.size
			if (j !== i && !this.panes[j].state.isMin) fromOthers += pj.size - pj.min
		}
		const emptySpace = Math.max(0, total - currentSum)
		const available = fromOthers + emptySpace
		const deficit = target - p.size
		if (deficit > available) target = p.size + available
		this.log("restorePane i=" + i, {target, available, deficit, lastNonZero: p.lastNonZero})
		p.size = target
		let newSum = 0
		for (const h of this.panes) newSum += this.internals.get(h)!.size
		if (newSum > total + 0.5) {
			const pinned = this.isMinFlags()
			pinned[i] = true
			this.clamp(total, pinned)
		} else if (this.accordionActive) {
			this.expandNonMinToFill()
		}
		this.applySizes()
		this.opts.onPaneExpand?.({paneIndex: i, pane: p.el})
	}

	private togglePane(i: number) {
		if (this.panes[i].state.isMin) this.restorePane(i)
		else this.minimizePane(i)
	}

	// ---- Accordion mode ----
	private requiredForAllExpanded(): number {
		let sum = 0
		for (const h of this.panes) sum += this.internals.get(h)!.min
		const gapCount = 2 * (this.panes.length - 1)
		return sum + this.gutterTotal() + (gapCount * this.gapPx()) + this.paddingPx()
	}

	private shouldBeAccordion(): boolean {
		if (!this.rootEl) return false
		let minimizable = 0
		for (const h of this.panes) if (this.internals.get(h)!.canMin) minimizable++
		if (minimizable < 2) return false
		return this.rootEl[this.clientAxis] < this.requiredForAllExpanded()
	}

	private enterAccordion() {
		if (this.accordionActive) return
		this.accordionActive = true
		this.rootEl?.classList.add("fluent-multi-splitter--accordion")
		const panes = this.panes
		// Keep priority: non-minimizable > first currently-expanded minimizable > pane 0.
		let keepIdx = -1
		for (let i = 0; i < panes.length; i++) {
			if (!this.internal(i).canMin) { keepIdx = i; break }
		}
		if (keepIdx === -1) {
			for (let i = 0; i < panes.length; i++) {
				if (this.internal(i).canMin && !panes[i].state.isMin) { keepIdx = i; break }
			}
		}
		if (keepIdx === -1) keepIdx = 0
		this.log("enterAccordion keepIdx=" + keepIdx)
		for (let k = 0; k < panes.length; k++) {
			if (k !== keepIdx) {
				const h = panes[k]
				const p = this.internals.get(h)!
				if (p.canMin && !h.state.isMin) {
					h.state.isMin = true
					p.size = this.opts.railSize
				}
			}
		}
		this.expandNonMinToFill()
		this.applySizes()
	}

	private exitAccordion() {
		if (!this.accordionActive) return
		this.accordionActive = false
		this.rootEl?.classList.remove("fluent-multi-splitter--accordion")
		this.log("exitAccordion")
	}

	private expandNonMinToFill() {
		expandNonMinToFill(this.sizedPanes(), this.isMinFlags(), this.totalAvailable())
	}

	// ---------- Context ----------
	createContext(): MultiSplitterContext {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this
		return {
			get orientation() { return self.opts.orientation },
			registerPane: (opts: PaneRegistration): PaneHandle => {
				const handle = new PaneHandleImpl(this.nextHandleId++)
				this.internals.set(handle, {
					el: opts.el,
					getGutterEl: opts.getGutterEl,
					canMin: opts.canMin,
					rawSize: opts.size,
					rawMin: opts.min,
					rawMax: opts.max,
					size: 0,
					min: 0,
					max: 0,
					lastNonZero: 0
				})
				this.panes = [...this.panes, handle]
				// Pane is flex-item; we drive size via flex-basis exclusively.
				opts.el.style.flex = "0 0 auto"
				this.scheduleInit()
				return handle
			},
			unregisterPane: (handle: PaneHandle) => {
				this.internals.delete(handle)
				this.panes = this.panes.filter(p => p !== handle)
			},
			indexOf: (handle: PaneHandle): number => this.panes.indexOf(handle),
			isLast: (handle: PaneHandle): boolean => this.panes.length > 0 && this.panes[this.panes.length - 1] === handle,
			isMinimized: (handle: PaneHandle): boolean => handle.state.isMin,
			onGutterPointerDown: (e, handle) => this.drag.start(e, handle),
			onGutterKeydown: (e, handle) => this.handleGutterKeydown(e, handle),
			onGutterDblClick: (e, handle) => this.handleGutterDblClick(e, handle),
			onPaneClick: (e, handle) => this.handlePaneClick(e, handle)
		}
	}

	// ---------- Initial size resolution ----------
	// Panes register one-by-one in onMount; we want to apply initial sizing
	// AFTER all panes have registered (so totalAvailable is correct). Schedule
	// a microtask + rAF: the microtask coalesces multiple registrations,
	// rAF gives the browser a chance to lay out a 0-sized container (hidden
	// parent / modal not yet open) before we clamp.
	private scheduleInit() {
		if (this.initScheduled) return
		this.initScheduled = true
		queueMicrotask(() => {
			requestAnimationFrame(() => {
				this.initScheduled = false
				if (this.panes.length < 2 || !this.rootEl) return
				// Install observer + toggle delegation immediately, even if
				// the container hasn't been laid out yet (mounted inside a
				// hidden tab panel etc). When the container transitions
				// 0 → non-zero, the observer's `!initApplied` branch runs
				// applyInitialSizes for the first time. Otherwise sizes
				// get clamped to 0 at mount and the panes render smashed
				// on first reveal.
				this.setupResizeObserver()
				this.setupToggleDelegation()
				this.applyInitialSizes()
			})
		})
	}

	private applyInitialSizes() {
		if (!this.rootEl || this.initApplied) return
		const initialTotal = this.resolveConstraints()
		// Defer until the container is actually laid out. Mounting inside a
		// hidden tab panel returns total=0 here; the ResizeObserver retries
		// this when the container reveals.
		if (initialTotal <= 0) return
		const panes = this.panes
		const N = panes.length
		const rootSizeRef = this.rootEl[this.clientAxis]
		const saved = readSplitterState(this.opts.persistKey)

		let explicitSum = 0
		const unspecified: number[] = []
		for (let p = 0; p < N; p++) {
			const internal = this.internal(p)
			const v = parseSize(internal.rawSize, rootSizeRef)
			if (v == null) {
				internal.size = 0
				unspecified.push(p)
			} else {
				internal.size = v
				explicitSum += v
			}
		}
		const leftover = initialTotal - explicitSum
		if (unspecified.length > 0) {
			const share = leftover / unspecified.length
			for (const u of unspecified) this.internal(u).size = Math.max(0, share)
		} else if (Math.abs(leftover) > 0.5) {
			// All sized but don't sum — give delta to the last pane.
			this.internal(N - 1).size += leftover
		}
		for (const h of panes) {
			const p = this.internals.get(h)!
			p.lastNonZero = p.size
		}

		// Overlay saved state (forgiving: matching-index entries are trusted,
		// extras ignored, missing slots fall through to attribute defaults).
		const startupMinimized: boolean[] = new Array(N).fill(false)
		if (saved?.sizes) {
			for (let s = 0; s < Math.min(N, saved.sizes.length); s++) {
				const internal = this.internal(s)
				if (typeof saved.sizes[s] === "number") internal.size = saved.sizes[s]
				if (saved.lasts && typeof saved.lasts[s] === "number" && saved.lasts[s] > internal.min) {
					internal.lastNonZero = saved.lasts[s]
				}
				if (saved.minimized?.[s]) startupMinimized[s] = !!internal.canMin
			}
		}

		// "At least one expanded pane" invariant.
		let allMin = true
		for (let sm = 0; sm < N; sm++) if (!startupMinimized[sm]) { allMin = false; break }
		if (allMin) startupMinimized[0] = false

		for (let m = 0; m < N; m++) {
			if (startupMinimized[m]) {
				panes[m].state.isMin = true
				this.internal(m).size = this.opts.railSize
			}
		}
		this.clamp(initialTotal, this.isMinFlags())
		this.applySizes({persist: false})
		if (this.shouldBeAccordion()) this.enterAccordion()
		this.initApplied = true
	}

	// ---------- Toggle delegation ----------
	private setupToggleDelegation() {
		if (this.toggleListenerInstalled || !this.rootEl) return
		this.toggleListenerInstalled = true
		this.rootEl.addEventListener("click", (e) => {
			const target = e.target as HTMLElement | null
			if (!target) return
			const toggle = target.closest("[data-multisplitter-toggle]")
			if (!toggle) return
			// Only the nearest splitter ancestor handles its own toggles.
			if (toggle.closest(".fluent-multi-splitter") !== this.rootEl) return
			// Find which pane owns this toggle.
			let paneEl: HTMLElement | null = null
			for (const h of this.panes) {
				if (this.internals.get(h)!.el.contains(toggle)) { paneEl = this.internals.get(h)!.el; break }
			}
			if (!paneEl) return
			const idx = this.panes.findIndex(h => this.internals.get(h)!.el === paneEl)
			if (idx < 0 || !this.internal(idx).canMin) return
			e.preventDefault()
			e.stopPropagation()
			this.togglePane(idx)
		})
	}

	// ---------- ResizeObserver ----------
	private setupResizeObserver() {
		if (this.resizeObserver || !this.rootEl || typeof ResizeObserver === "undefined") return
		let lastTotal = this.totalAvailable()
		this.resizeObserver = new ResizeObserver(() => {
			if (!this.rootEl) return
			const total = this.resolveConstraints()
			if (Math.abs(total - lastTotal) < 0.5) return
			// Container hidden (display:none, tab switched away, parent
			// detached). Record the new total but leave pane sizes alone —
			// running clampToConstraints/scale against total=0 would zero
			// every flex-basis and the user would lose their layout on the
			// next reveal.
			if (total <= 0) { lastTotal = total; return }
			// Deferred init: container was hidden at mount time, now we
			// finally have a real box to size against.
			if (!this.initApplied) {
				this.applyInitialSizes()
				lastTotal = total
				return
			}
			// Reveal after hide (lastTotal was 0). Fall through to the
			// scale path so pane sizes get rescaled if the container width
			// changed while hidden.
			const wantAccordion = this.shouldBeAccordion()
			if (wantAccordion && !this.accordionActive) {
				this.enterAccordion()
				lastTotal = total
				return
			}
			if (!wantAccordion && this.accordionActive) this.exitAccordion()
			// Scale non-min pool; min panes hold at railSize.
			let oldNonMinSum = 0
			let railBudget = 0
			for (const h of this.panes) {
				const p = this.internals.get(h)!
				if (h.state.isMin) railBudget += p.size
				else oldNonMinSum += p.size
			}
			const newNonMinTotal = total - railBudget
			if (oldNonMinSum > 0 && newNonMinTotal > 0) {
				const scale = newNonMinTotal / oldNonMinSum
				for (const h of this.panes) {
					if (!h.state.isMin) this.internals.get(h)!.size *= scale
				}
			}
			if (this.accordionActive) this.expandNonMinToFill()
			else this.clamp(total, this.isMinFlags())
			this.applySizes({persist: false})
			lastTotal = total
		})
		this.resizeObserver.observe(this.rootEl)
	}

	destroy() {
		this.resizeObserver?.disconnect()
		if (this.reflowTimer != null) clearTimeout(this.reflowTimer)
		this.drag.destroy()
	}
}
